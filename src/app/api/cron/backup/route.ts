import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { isR2Configured, putObject, listObjects, deleteObject } from "@/lib/backup/r2";
import { selectBackupsToDelete } from "@/lib/backup/retention";

/**
 * Nightly off-platform backup endpoint.
 * Exports all wedding data as JSON and uploads it to Cloudflare R2.
 *
 * Intended to be called by a cron job (Vercel Cron). Protected by a shared
 * secret in the Authorization header (see requireCronAuth).
 *
 * A backup is only "real" if it lands off-platform, so a missing R2 config or a
 * failed upload is logged as an ERROR — that way the cron dead-man's switch and
 * ops alerting surface it instead of silently storing nothing.
 *
 * Env vars required (see src/lib/backup/r2.ts):
 *   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */

const BACKUP_PREFIX = "backups/";

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Get all weddings. Select the FULL row (not just id + names) so a restore
    // can recreate the wedding record itself — user_id, date, phase and every
    // other column must be in the backup or a full restore hits NOT NULL errors.
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("*");

    if (weddingsError) throw new Error(`Failed to fetch weddings: ${weddingsError.message}`);

    async function backupWedding(wedding: { id: string; partner1_name: string; partner2_name: string }) {
      const [
        { data: guests },
        { data: vendors },
        { data: tasks },
        { data: expenses },
        { data: weddingParty },
        { data: seatingTables },
        { data: seatAssignments },
        { data: ceremonyPositions },
        { data: chatMessages },
        { data: questionnaire },
        { data: dayOfPlan },
        { data: moodBoard },
        { data: registryLinks },
        { data: collaborators },
        { data: activityLog },
        { data: attachments },
      ] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", wedding.id),
        supabase.from("vendors").select("*").eq("wedding_id", wedding.id),
        supabase.from("tasks").select("*").eq("wedding_id", wedding.id),
        supabase.from("expenses").select("*").eq("wedding_id", wedding.id),
        supabase.from("wedding_party").select("*").eq("wedding_id", wedding.id),
        supabase.from("seating_tables").select("*").eq("wedding_id", wedding.id),
        supabase.from("seat_assignments").select("*, seating_tables!inner(wedding_id)").eq("seating_tables.wedding_id", wedding.id),
        supabase.from("ceremony_positions").select("*").eq("wedding_id", wedding.id),
        supabase.from("chat_messages").select("*").eq("wedding_id", wedding.id),
        supabase.from("questionnaire_responses").select("*").eq("wedding_id", wedding.id).single(),
        supabase.from("day_of_plans").select("*").eq("wedding_id", wedding.id).single(),
        supabase.from("mood_board_items").select("*").eq("wedding_id", wedding.id),
        supabase.from("registry_links").select("*").eq("wedding_id", wedding.id),
        supabase.from("wedding_collaborators").select("*").eq("wedding_id", wedding.id),
        supabase.from("activity_log").select("*").eq("wedding_id", wedding.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("attachments").select("*").eq("wedding_id", wedding.id),
      ]);

      return {
        weddingId: wedding.id,
        data: {
          metadata: {
            exportedAt: new Date().toISOString(),
            weddingId: wedding.id,
            partnerNames: `${wedding.partner1_name} & ${wedding.partner2_name}`,
            version: "1.0",
            type: "automated-backup",
          },
          wedding,
          guests: guests || [],
          vendors: vendors || [],
          tasks: tasks || [],
          expenses: expenses || [],
          weddingParty: weddingParty || [],
          seatingTables: seatingTables || [],
          seatAssignments: seatAssignments || [],
          ceremonyPositions: ceremonyPositions || [],
          chatMessages: chatMessages || [],
          questionnaireResponses: questionnaire || null,
          dayOfPlan: dayOfPlan || null,
          moodBoard: moodBoard || [],
          registryLinks: registryLinks || [],
          collaborators: collaborators || [],
          activityLog: activityLog || [],
          attachments: attachments || [],
        },
      };
    }

    // Process weddings in concurrent batches of 5
    const BATCH_SIZE = 5;
    const allWeddings = weddings || [];
    const backups: Array<{ weddingId: string; data: Record<string, unknown> }> = [];

    for (let i = 0; i < allWeddings.length; i += BATCH_SIZE) {
      const batch = allWeddings.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(backupWedding));
      backups.push(...results);
    }

    // Build the backup payload
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      weddingCount: backups.length,
      weddings: backups,
    };

    const backupJson = JSON.stringify(fullBackup, null, 2);
    const date = new Date().toISOString().split("T")[0];
    const filename = `eydn-backup-${date}.json`;
    const key = `${BACKUP_PREFIX}${filename}`;

    let uploaded = false;
    let pruned: string[] = [];
    let note: string | undefined;

    if (!isR2Configured()) {
      note =
        "R2 not configured — backup generated but NOT stored off-platform. Set R2_ENDPOINT / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.";
      console.warn(`[BACKUP] ${filename}: ${backups.length} weddings, ${backupJson.length} bytes (${note})`);
    } else {
      try {
        await putObject(key, backupJson, "application/json");
        uploaded = true;
        console.info(`[BACKUP] ${filename}: ${backups.length} weddings, ${backupJson.length} bytes → r2:${key}`);

        // Apply retention (best-effort; failure here does not fail the backup).
        try {
          const existing = await listObjects(BACKUP_PREFIX);
          const toDelete = selectBackupsToDelete(
            existing.map((o) => o.key),
            { referenceDate: new Date() }
          );
          for (const k of toDelete) await deleteObject(k);
          pruned = toDelete;
          if (toDelete.length) console.info(`[BACKUP] retention pruned ${toDelete.length} old backups`);
        } catch (retErr) {
          console.error("[BACKUP] retention failed (non-fatal):", retErr instanceof Error ? retErr.message : retErr);
        }
      } catch (uploadError) {
        note = `R2 upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
        console.error("[BACKUP]", note);
      }
    }

    // Always log. An export that wasn't stored off-platform is a failed backup,
    // so it's logged as an error to trigger the ops alert + dead-man's switch.
    await logCronExecution({
      jobName: "backup",
      status: uploaded ? "success" : "error",
      durationMs: Date.now() - startTime,
      details: { filename, key, weddings: backups.length, bytes: backupJson.length, stored: uploaded, pruned: pruned.length, note },
      errorMessage: uploaded ? undefined : note,
    });

    return NextResponse.json({
      success: uploaded,
      filename,
      key,
      weddings: backups.length,
      bytes: backupJson.length,
      stored: uploaded,
      pruned: pruned.length,
      note,
    });
  } catch (error) {
    console.error("[BACKUP] Failed:", error instanceof Error ? error.message : error);
    await logCronExecution({
      jobName: "backup",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}

// Vercel cron always sends GET; admin manual-trigger UI POSTs internally.
// Re-export so both work.
export const POST = GET;
