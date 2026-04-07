import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

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

  // Check RLS status (informational — we know our tables have it enabled)
  const protectedTables = [
    "weddings", "guests", "vendors", "tasks", "expenses",
    "wedding_party", "seating_tables", "mood_board_items",
    "wedding_collaborators", "activity_log", "chat_messages",
  ];

  // SFTP backup config status
  const sftpConfigured = !!(process.env.BACKUP_SFTP_HOST && process.env.BACKUP_SFTP_USER);

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
      sftpConfigured,
      sftpHost: sftpConfigured ? process.env.BACKUP_SFTP_HOST : null,
      sftpPath: process.env.BACKUP_SFTP_PATH || "/backups/eydn",
      cronSchedule: "Daily at 3:00 AM UTC",
      supabasePlan: "Pro",
      supabasePITR: true,
      supabaseRetention: "7 days",
    },
    recentActivity: recentActivity || [],
  });
}

/** Trigger a manual backup */
export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const secret = process.env.BACKUP_SECRET;
  if (!secret) {
    console.error("[backups] Backup service not configured");
    return NextResponse.json({ error: "Backup service not configured" }, { status: 503 });
  }

  // Call the backup cron endpoint internally
  const origin = request.headers.get("origin") || request.headers.get("host") || "localhost:3000";
  const protocol = origin.includes("localhost") ? "http" : "https";
  const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;

  try {
    const res = await fetch(`${baseUrl}/api/cron/backup`, {
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
