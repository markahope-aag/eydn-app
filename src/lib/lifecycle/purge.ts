import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";

type AdminClient = SupabaseClient<Database>;

/**
 * Child tables purged when a wedding is sunsetted, in FK-safe order (children
 * before parents). `seat_assignments` is special-cased because it has no
 * wedding_id — it's reached via its parent seating_tables.
 */
export const SUNSET_PURGE_TABLES = [
  "seat_assignments",
  "ceremony_positions",
  "seating_tables",
  "wedding_party",
  "chat_messages",
  "mood_board_items",
  "registry_links",
  "activity_log",
  "expenses",
  "tasks",
  "vendors",
  "guests",
  "attachments",
  "questionnaire_responses",
  "day_of_plans",
] as const;

/**
 * Purge all child data for a sunsetted wedding. Builds a final backup export
 * first (logged), then deletes the associated rows. The wedding row itself is
 * preserved (phase = "sunset") for record-keeping.
 *
 * Note: despite the historical "soft delete" framing, the child rows are hard
 * deleted — the backup payload is the record of what was removed.
 */
export async function purgeWeddingData(
  supabase: AdminClient,
  weddingId: string
): Promise<void> {
  const [
    { data: guests },
    { data: vendors },
    { data: tasks },
    { data: expenses },
    { data: weddingParty },
    { data: seatingTables },
    { data: ceremonyPositions },
    { data: chatMessages },
    { data: questionnaire },
    { data: dayOfPlan },
    { data: moodBoard },
    { data: registryLinks },
  ] = await Promise.all([
    supabase.from("guests").select("*").eq("wedding_id", weddingId),
    supabase.from("vendors").select("*").eq("wedding_id", weddingId),
    supabase.from("tasks").select("*").eq("wedding_id", weddingId),
    supabase.from("expenses").select("*").eq("wedding_id", weddingId),
    supabase.from("wedding_party").select("*").eq("wedding_id", weddingId),
    supabase.from("seating_tables").select("*").eq("wedding_id", weddingId),
    supabase.from("ceremony_positions").select("*").eq("wedding_id", weddingId),
    supabase.from("chat_messages").select("*").eq("wedding_id", weddingId),
    supabase.from("questionnaire_responses").select("*").eq("wedding_id", weddingId).single(),
    supabase.from("day_of_plans").select("*").eq("wedding_id", weddingId).single(),
    supabase.from("mood_board_items").select("*").eq("wedding_id", weddingId),
    supabase.from("registry_links").select("*").eq("wedding_id", weddingId),
  ]);

  const backupPayload = {
    weddingId,
    exportedAt: new Date().toISOString(),
    type: "sunset-final-backup",
    data: {
      guests: guests || [],
      vendors: vendors || [],
      tasks: tasks || [],
      expenses: expenses || [],
      weddingParty: weddingParty || [],
      seatingTables: seatingTables || [],
      ceremonyPositions: ceremonyPositions || [],
      chatMessages: chatMessages || [],
      questionnaireResponses: questionnaire || null,
      dayOfPlan: dayOfPlan || null,
      moodBoard: moodBoard || [],
      registryLinks: registryLinks || [],
    },
  };

  logger.info(
    { weddingId, bytes: JSON.stringify(backupPayload).length },
    `Final backup for sunset wedding ${weddingId}`
  );

  for (const table of SUNSET_PURGE_TABLES) {
    if (table === "seat_assignments") {
      const { data: tables } = await supabase
        .from("seating_tables")
        .select("id")
        .eq("wedding_id", weddingId);

      if (tables && tables.length > 0) {
        const tableIds = tables.map((t) => t.id);
        await supabase.from("seat_assignments").delete().in("table_id", tableIds);
      }
      continue;
    }

    const { error } = await supabase.from(table).delete().eq("wedding_id", weddingId);
    if (error) {
      logger.error(
        { weddingId, table, error: error.message },
        `Failed to purge ${table} for wedding ${weddingId}`
      );
    }
  }
}
