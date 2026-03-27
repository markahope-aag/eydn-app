import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // --- Table row counts (exclude soft-deleted where applicable) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Fire all queries in parallel
  const [
    // Soft-delete tables — active counts
    guestsActive,
    vendorsActive,
    tasksActive,
    expensesActive,
    weddingPartyActive,
    moodBoardActive,
    seatingTablesActive,
    // Soft-delete tables — deleted counts
    guestsDeleted,
    vendorsDeleted,
    tasksDeleted,
    expensesDeleted,
    weddingPartyDeleted,
    moodBoardDeleted,
    seatingTablesDeleted,
    // Plain tables
    weddingsCount,
    seatAssignmentsCount,
    chatMessagesCount,
    notificationsCount,
    attachmentsCount,
    blogPostsCount,
    suggestedVendorsCount,
    activityLogCount,
    cronLogCount,
    emailEventsCount,
    dateChangeAlertsCount,
    // Growth indicators
    weddingsLast7d,
    weddingsLast30d,
    guestsLast7d,
    tasksLast7d,
    chatMessagesLast7d,
    chatMessagesLast30d,
    // Backup status
    lastBackup,
    backupsLast7d,
    backupErrorsLast7d,
  ] = await Promise.all([
    // Active counts (soft-delete tables)
    supabase.from("guests").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("vendors").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("expenses").select("*", { count: "exact", head: true }).is("deleted_at", null),
    sb.from("wedding_party").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("mood_board_items").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("seating_tables").select("*", { count: "exact", head: true }).is("deleted_at", null),
    // Soft-deleted counts
    supabase.from("guests").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("vendors").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("expenses").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    sb.from("wedding_party").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("mood_board_items").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("seating_tables").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
    // Plain tables
    supabase.from("weddings").select("*", { count: "exact", head: true }),
    sb.from("seat_assignments").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    sb.from("notifications").select("*", { count: "exact", head: true }),
    sb.from("attachments").select("*", { count: "exact", head: true }),
    sb.from("blog_posts").select("*", { count: "exact", head: true }),
    sb.from("suggested_vendors").select("*", { count: "exact", head: true }),
    supabase.from("activity_log").select("*", { count: "exact", head: true }),
    sb.from("cron_log").select("*", { count: "exact", head: true }),
    sb.from("email_events").select("*", { count: "exact", head: true }),
    sb.from("date_change_alerts").select("*", { count: "exact", head: true }),
    // Growth — weddings
    supabase.from("weddings").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("weddings").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
    // Growth — guests
    supabase.from("guests").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    // Growth — tasks
    supabase.from("tasks").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    // Growth — chat messages
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
    // Last backup from cron_log
    sb
      .from("cron_log")
      .select("*")
      .eq("job_name", "backup")
      .order("started_at", { ascending: false })
      .limit(1),
    // Backups in last 7 days
    sb
      .from("cron_log")
      .select("*", { count: "exact", head: true })
      .eq("job_name", "backup")
      .gte("started_at", sevenDaysAgo.toISOString()),
    // Backup errors in last 7 days
    sb
      .from("cron_log")
      .select("*", { count: "exact", head: true })
      .eq("job_name", "backup")
      .eq("status", "error")
      .gte("started_at", sevenDaysAgo.toISOString()),
  ]);

  const c = (r: { count: number | null }) => r.count ?? 0;
  const lastBackupRow = lastBackup.data?.[0] as Record<string, unknown> | undefined;

  const sftpConfigured = !!(process.env.BACKUP_SFTP_HOST && process.env.BACKUP_SFTP_USER);

  return NextResponse.json({
    tables: {
      weddings: c(weddingsCount),
      guests: c(guestsActive),
      vendors: c(vendorsActive),
      tasks: c(tasksActive),
      expenses: c(expensesActive),
      wedding_party: c(weddingPartyActive),
      mood_board_items: c(moodBoardActive),
      seating_tables: c(seatingTablesActive),
      seat_assignments: c(seatAssignmentsCount),
      chat_messages: c(chatMessagesCount),
      notifications: c(notificationsCount),
      attachments: c(attachmentsCount),
      blog_posts: c(blogPostsCount),
      suggested_vendors: c(suggestedVendorsCount),
      activity_log: c(activityLogCount),
      cron_log: c(cronLogCount),
      email_events: c(emailEventsCount),
      date_change_alerts: c(dateChangeAlertsCount),
    },
    storage: {
      totalAttachments: c(attachmentsCount),
    },
    growth: {
      weddingsLast7d: c(weddingsLast7d),
      weddingsLast30d: c(weddingsLast30d),
      guestsLast7d: c(guestsLast7d),
      tasksLast7d: c(tasksLast7d),
      chatMessagesLast7d: c(chatMessagesLast7d),
      chatMessagesLast30d: c(chatMessagesLast30d),
    },
    softDeleted: {
      guests: c(guestsDeleted),
      vendors: c(vendorsDeleted),
      tasks: c(tasksDeleted),
      expenses: c(expensesDeleted),
      wedding_party: c(weddingPartyDeleted),
      mood_board_items: c(moodBoardDeleted),
      seating_tables: c(seatingTablesDeleted),
    },
    backup: {
      lastBackupAt: (lastBackupRow?.started_at as string) ?? null,
      lastBackupStatus: (lastBackupRow?.status as string) ?? null,
      lastBackupDuration: (lastBackupRow?.duration_ms as number) ?? null,
      backupsLast7d: c(backupsLast7d),
      backupErrorsLast7d: c(backupErrorsLast7d),
      sftpConfigured,
    },
  });
}
