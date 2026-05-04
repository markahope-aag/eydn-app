import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Nightly off-platform backup endpoint.
 * Exports all wedding data as JSON and uploads via SFTP to the Hetzner/Coolify server.
 *
 * Intended to be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external scheduler).
 * Protected by a shared secret in the Authorization header.
 *
 * Env vars required:
 *   BACKUP_SECRET        — shared secret to authorize the cron call
 *   BACKUP_SFTP_HOST     — Hetzner server hostname/IP
 *   BACKUP_SFTP_PORT     — SFTP port (default 22)
 *   BACKUP_SFTP_USER     — SSH username
 *   BACKUP_SFTP_PASSWORD — SSH password (or use key-based auth)
 *   BACKUP_SFTP_PATH     — Remote directory for backups (e.g., /backups/eydn)
 */

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Get all weddings
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, partner1_name, partner2_name");

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

    // Upload via SFTP
    const sftpHost = process.env.BACKUP_SFTP_HOST;
    const sftpPort = process.env.BACKUP_SFTP_PORT || "22";
    const sftpUser = process.env.BACKUP_SFTP_USER;
    const sftpPassword = process.env.BACKUP_SFTP_PASSWORD;
    const sftpPath = process.env.BACKUP_SFTP_PATH || "/backups/eydn";

    if (!sftpHost || !sftpUser) {
      // No SFTP configured — log the backup locally and return
      console.info(`[BACKUP] ${filename}: ${backups.length} weddings, ${backupJson.length} bytes (SFTP not configured)`);
      return NextResponse.json({
        success: true,
        filename,
        weddings: backups.length,
        bytes: backupJson.length,
        sftp: false,
        message: "Backup created but SFTP not configured. Set BACKUP_SFTP_HOST and BACKUP_SFTP_USER env vars.",
      });
    }

    // Dynamic import ssh2-sftp-client (only needed at runtime)
    let sftpUploaded = false;
    try {
      const SftpClient = (await import("ssh2-sftp-client")).default;
      const sftp = new SftpClient();

      await sftp.connect({
        host: sftpHost,
        port: parseInt(sftpPort, 10),
        username: sftpUser,
        password: sftpPassword || undefined,
      });

      // Ensure directory exists
      const remotePath = `${sftpPath}/${filename}`;
      try {
        await sftp.mkdir(sftpPath, true);
      } catch {
        // Directory may already exist
      }

      // Upload
      await sftp.put(Buffer.from(backupJson, "utf-8"), remotePath);
      await sftp.end();
      sftpUploaded = true;

      console.info(`[BACKUP] ${filename}: ${backups.length} weddings, ${backupJson.length} bytes → ${sftpHost}:${remotePath}`);
    } catch (sftpError) {
      console.error("[BACKUP] SFTP upload failed:", sftpError instanceof Error ? sftpError.message : sftpError);
      // Don't fail the whole request — backup data was still generated
    }

    await logCronExecution({
      jobName: "backup",
      status: "success",
      durationMs: Date.now() - startTime,
      details: { filename, weddings: backups.length, bytes: backupJson.length, sftp: sftpUploaded },
    });

    return NextResponse.json({
      success: true,
      filename,
      weddings: backups.length,
      bytes: backupJson.length,
      sftp: sftpUploaded,
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
