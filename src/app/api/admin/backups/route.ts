import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { isR2Configured, listObjects, r2Bucket } from "@/lib/backup/r2";

interface R2BackupStatus {
  configured: boolean;
  bucket: string | null;
  dailyCount: number;
  sunsetCount: number;
  latestKey: string | null;
  latestAt: string | null;
  latestBytes: number | null;
  error: string | null;
}

/** Report the real off-platform backup state by listing R2 — best effort. */
async function getR2Status(): Promise<R2BackupStatus> {
  const base: R2BackupStatus = {
    configured: isR2Configured(),
    bucket: isR2Configured() ? r2Bucket() : null,
    dailyCount: 0,
    sunsetCount: 0,
    latestKey: null,
    latestAt: null,
    latestBytes: null,
    error: null,
  };
  if (!base.configured) return base;
  try {
    const [daily, sunset] = await Promise.all([listObjects("backups/"), listObjects("sunset/")]);
    base.dailyCount = daily.length;
    base.sunsetCount = sunset.length;
    const latest = [...daily].sort(
      (a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
    )[0];
    if (latest) {
      base.latestKey = latest.key;
      base.latestAt = latest.lastModified?.toISOString() ?? null;
      base.latestBytes = latest.size;
    }
  } catch (e) {
    base.error = e instanceof Error ? e.message : "Failed to list R2 backups";
  }
  return base;
}

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Get backup-related stats
  const [
    { count: totalWeddings },
    { count: totalGuests },
    { count: totalTasks },
    { count: totalVendors },
    { count: totalExpenses },
    { count: totalChatMessages },
    { count: totalMoodItems },
    { count: totalPhotos },
    { count: softDeletedGuests },
    { count: softDeletedVendors },
    { count: softDeletedTasks },
    { count: activityLogCount },
  ] = await Promise.all([
    supabase.from("weddings").select("*", { count: "exact", head: true }),
    supabase.from("guests").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("vendors").select("*", { count: "exact", head: true }),
    supabase.from("expenses").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    supabase.from("mood_board_items").select("*", { count: "exact", head: true }),
    supabase.from("wedding_photos").select("*", { count: "exact", head: true }),
    supabase.from("guests").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("vendors").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("activity_log").select("*", { count: "exact", head: true }),
  ]);

  // Get recent activity log entries
  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("action, entity_type, entity_name, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Real off-platform backup status: R2 listing + the last backup cron run +
  // the last independent watchdog verification.
  const [r2Status, { data: lastBackupRun }, { data: lastWatchdogRun }] = await Promise.all([
    getR2Status(),
    supabase
      .from("cron_log")
      .select("status, started_at, duration_ms, error_message, details")
      .eq("job_name", "backup")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cron_log")
      .select("status, started_at, error_message")
      .eq("job_name", "backup-watchdog")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Check RLS status (informational — we know our tables have it enabled)
  const protectedTables = [
    "weddings", "guests", "vendors", "tasks", "expenses",
    "wedding_party", "seating_tables", "mood_board_items",
    "wedding_collaborators", "activity_log", "chat_messages",
  ];

  return NextResponse.json({
    dataStats: {
      weddings: totalWeddings ?? 0,
      guests: totalGuests ?? 0,
      tasks: totalTasks ?? 0,
      vendors: totalVendors ?? 0,
      expenses: totalExpenses ?? 0,
      chatMessages: totalChatMessages ?? 0,
      moodBoardItems: totalMoodItems ?? 0,
      photos: totalPhotos ?? 0,
    },
    softDeleted: {
      guests: softDeletedGuests ?? 0,
      vendors: softDeletedVendors ?? 0,
      tasks: softDeletedTasks ?? 0,
    },
    security: {
      rlsEnabled: true,
      protectedTables,
      rateLimiting: true,
      securityHeaders: true,
      inputValidation: true,
      softDeletes: true,
      auditLogging: true,
      activityLogEntries: activityLogCount ?? 0,
    },
    backup: {
      provider: "Cloudflare R2",
      configured: r2Status.configured,
      bucket: r2Status.bucket,
      cronSchedule: "Daily at 3:00 AM UTC",
      retentionPolicy: "30 daily, then 1/month for 12 months",
      dailyBackupCount: r2Status.dailyCount,
      sunsetBackupCount: r2Status.sunsetCount,
      latestBackupKey: r2Status.latestKey,
      latestBackupAt: r2Status.latestAt,
      latestBackupBytes: r2Status.latestBytes,
      listError: r2Status.error,
      lastRun: lastBackupRun
        ? {
            status: lastBackupRun.status,
            at: lastBackupRun.started_at,
            durationMs: lastBackupRun.duration_ms,
            error: lastBackupRun.error_message,
          }
        : null,
      lastVerification: lastWatchdogRun
        ? {
            status: lastWatchdogRun.status,
            at: lastWatchdogRun.started_at,
            error: lastWatchdogRun.error_message,
          }
        : null,
    },
    recentActivity: recentActivity || [],
  });
}

/** Trigger a manual backup */
export async function POST() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const secret = process.env.BACKUP_SECRET;
  if (!secret) {
    console.error("[backups] Backup service not configured");
    return NextResponse.json({ error: "Backup service not configured" }, { status: 503 });
  }

  // Call the backup cron endpoint internally. The base URL MUST come from a
  // trusted env var — never from request headers (origin/host), which a caller
  // can spoof to exfiltrate BACKUP_SECRET to an attacker-controlled host.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

  try {
    const res = await fetch(new URL("/api/cron/backup", appUrl).toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}
