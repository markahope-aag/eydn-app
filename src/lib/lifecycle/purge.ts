import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";
import { isR2Configured, putObject, objectExists } from "@/lib/backup/r2";

type AdminClient = SupabaseClient<Database>;

/**
 * Thrown when a sunset purge cannot safely proceed because the final backup
 * was not confirmed stored off-platform. Hard deletion is skipped — the data
 * is left intact so the run can be retried once backups are healthy.
 */
export class PurgeBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurgeBackupError";
  }
}

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
 * Purge all child data for a sunsetted wedding. Builds a final backup export,
 * stores it off-platform in R2, VERIFIES it landed, and only then hard-deletes
 * the associated rows. The wedding row itself is preserved (phase = "sunset")
 * for record-keeping.
 *
 * Fail-safe: if R2 is not configured, the upload fails, or the stored object
 * cannot be verified, this throws PurgeBackupError WITHOUT deleting anything.
 * Losing user data is far worse than deferring a purge, so no confirmed backup
 * means no delete.
 *
 * Note: despite the historical "soft delete" framing, the child rows are hard
 * deleted — the R2 backup is the only record of what was removed, so it must
 * exist before we touch the data.
 *
 * @returns the R2 key of the stored final backup
 */
export async function purgeWeddingData(
  supabase: AdminClient,
  weddingId: string
): Promise<string> {
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
    { data: activityLog },
    { data: attachments },
    { data: seatAssignments },
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
    supabase.from("activity_log").select("*").eq("wedding_id", weddingId),
    supabase.from("attachments").select("*").eq("wedding_id", weddingId),
    supabase
      .from("seat_assignments")
      .select("*, seating_tables!inner(wedding_id)")
      .eq("seating_tables.wedding_id", weddingId),
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
      activityLog: activityLog || [],
      attachments: attachments || [],
      seatAssignments: seatAssignments || [],
    },
  };

  const backupJson = JSON.stringify(backupPayload);

  // FAIL-SAFE: the final backup MUST be stored off-platform and verified before
  // any row is deleted. No confirmed backup → abort the purge, leave data intact.
  if (!isR2Configured()) {
    throw new PurgeBackupError(
      `Sunset purge aborted for ${weddingId}: R2 not configured, cannot store final backup. Data left intact.`
    );
  }

  const date = new Date().toISOString().split("T")[0];
  const backupKey = `sunset/${weddingId}-${date}.json`;

  try {
    await putObject(backupKey, backupJson, "application/json");
  } catch (uploadError) {
    throw new PurgeBackupError(
      `Sunset purge aborted for ${weddingId}: final backup upload to R2 failed (${
        uploadError instanceof Error ? uploadError.message : String(uploadError)
      }). Data left intact.`
    );
  }

  // Verify the object actually landed before we destroy the source data.
  const stored = await objectExists(backupKey);
  if (!stored) {
    throw new PurgeBackupError(
      `Sunset purge aborted for ${weddingId}: final backup ${backupKey} could not be verified in R2. Data left intact.`
    );
  }

  logger.info(
    { weddingId, key: backupKey, bytes: backupJson.length },
    `Final backup stored for sunset wedding ${weddingId} → r2:${backupKey}`
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

  return backupKey;
}
