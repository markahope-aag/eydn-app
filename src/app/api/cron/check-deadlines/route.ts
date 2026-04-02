import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { sendEmail } from "@/lib/email";
import { getEmailPreferences } from "@/lib/email-preferences";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/validation";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();
  let emailsSent = 0;

  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const today = new Date().toISOString().split("T")[0];
    const targetDate = sevenDaysFromNow.toISOString().split("T")[0];

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, wedding_id, title, due_date")
      .eq("completed", false)
      .is("deleted_at", null)
      .gte("due_date", today)
      .lte("due_date", targetDate);

    // ── Overdue tasks (due_date < today, not completed) ──────────────────────
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, wedding_id, title, due_date")
      .eq("completed", false)
      .is("deleted_at", null)
      .lt("due_date", today);

    // Check which overdue tasks already have overdue notifications
    const overdueTaskIds = (overdueTasks || []).map((t) => t.id);
    let existingOverdueTaskIds = new Set<string | null>();
    if (overdueTaskIds.length > 0) {
      const { data: existingOverdue } = await supabase
        .from("notifications")
        .select("task_id")
        .in("task_id", overdueTaskIds)
        .eq("type", "overdue_task");

      existingOverdueTaskIds = new Set(
        (existingOverdue || []).map((n: { task_id: string | null }) => n.task_id)
      );
    }

    const newOverdueTasks = (overdueTasks || []).filter((t) => !existingOverdueTaskIds.has(t.id));

    const overdueNotifications = newOverdueTasks.map((t) => ({
      wedding_id: t.wedding_id,
      type: "overdue_task",
      title: `Overdue: ${t.title}`,
      body: `This task was due on ${t.due_date}. Update it or mark it complete.`,
      task_id: t.id,
    }));

    if (overdueNotifications.length > 0) {
      await supabase.from("notifications").insert(overdueNotifications);
    }

    // ── Upcoming tasks (due within 7 days) ─────────────────────────────────
    if (!tasks || tasks.length === 0) {
      // Still need to handle overdue emails below, so don't return early
    }

    // Check which upcoming tasks already have notifications
    const taskIds = (tasks || []).map((t) => t.id);
    let existingTaskIds = new Set<string | null>();
    if (taskIds.length > 0) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("task_id")
        .in("task_id", taskIds)
        .eq("type", "deadline_reminder");

      existingTaskIds = new Set(
        (existing || []).map((n: { task_id: string | null }) => n.task_id)
      );
    }

    const newTasks = (tasks || []).filter((t) => !existingTaskIds.has(t.id));

    const newNotifications = newTasks.map((t) => ({
      wedding_id: t.wedding_id,
      type: "deadline_reminder",
      title: `Upcoming: ${t.title}`,
      body: `This task is due on ${t.due_date}. Make sure you're on track!`,
      task_id: t.id,
    }));

    if (newNotifications.length > 0) {
      await supabase.from("notifications").insert(newNotifications);
    }

    const totalNotifications = newNotifications.length + overdueNotifications.length;

    // ── Send emails — group tasks by wedding for one email per couple ──────
    // Combine upcoming + overdue tasks by wedding
    const upcomingByWedding = new Map<string, Array<{ title: string; due_date: string }>>();
    for (const t of newTasks) {
      const list = upcomingByWedding.get(t.wedding_id) || [];
      list.push({ title: t.title, due_date: t.due_date || "" });
      upcomingByWedding.set(t.wedding_id, list);
    }

    const overdueByWedding = new Map<string, Array<{ title: string; due_date: string }>>();
    for (const t of newOverdueTasks) {
      const list = overdueByWedding.get(t.wedding_id) || [];
      list.push({ title: t.title, due_date: t.due_date || "" });
      overdueByWedding.set(t.wedding_id, list);
    }

    // Collect all wedding IDs that need emails
    const allWeddingIds = new Set([...upcomingByWedding.keys(), ...overdueByWedding.keys()]);

    for (const weddingId of allWeddingIds) {
      try {
        // Check email preferences before sending
        const prefs = await getEmailPreferences(weddingId);
        if (prefs.unsubscribed_all || !prefs.deadline_reminders) continue;

        const { data: wedding } = await supabase
          .from("weddings")
          .select("user_id, partner1_name, partner2_name")
          .eq("id", weddingId)
          .single();

        if (!wedding?.user_id) continue;

        const clerk = await clerkClient();
        const user = await clerk.users.getUser(wedding.user_id);
        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (!userEmail) continue;

        const escapedName = escapeHtml(wedding.partner1_name);
        const weddingUpcoming = upcomingByWedding.get(weddingId) || [];
        const weddingOverdue = overdueByWedding.get(weddingId) || [];

        let sectionsHtml = "";

        if (weddingOverdue.length > 0) {
          const overdueListHtml = weddingOverdue
            .map((t) => `<li><strong>${escapeHtml(t.title)}</strong> — was due ${escapeHtml(t.due_date)}</li>`)
            .join("");
          sectionsHtml += `
            <h2 style="color: #A0204A; font-size: 20px;">Overdue tasks</h2>
            <p>Hi ${escapedName}! You have ${weddingOverdue.length} overdue task${weddingOverdue.length > 1 ? "s" : ""} that need attention:</p>
            <ul style="padding-left: 20px;">${overdueListHtml}</ul>
          `;
        }

        if (weddingUpcoming.length > 0) {
          const upcomingListHtml = weddingUpcoming
            .map((t) => `<li><strong>${escapeHtml(t.title)}</strong> — due ${escapeHtml(t.due_date)}</li>`)
            .join("");
          sectionsHtml += `
            <h2 style="color: #1A1A2E; font-size: 20px;">Upcoming deadlines this week</h2>
            <p>${weddingOverdue.length > 0 ? "You also have" : `Hi ${escapedName}! You have`} ${weddingUpcoming.length} task${weddingUpcoming.length > 1 ? "s" : ""} coming up:</p>
            <ul style="padding-left: 20px;">${upcomingListHtml}</ul>
          `;
        }

        const subjectParts: string[] = [];
        if (weddingOverdue.length > 0) subjectParts.push(`${weddingOverdue.length} overdue`);
        if (weddingUpcoming.length > 0) subjectParts.push(`${weddingUpcoming.length} due this week`);

        await sendEmail({
          to: userEmail,
          subject: `${wedding.partner1_name} & ${wedding.partner2_name} — ${subjectParts.join(", ")}`,
          html: `
            <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
                <img src="https://eydn.app/logo-white.png" alt="Eydn" height="34" style="height: 34px; width: auto;" />
              </div>
              <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
                ${sectionsHtml}
                <p style="text-align: center; margin-top: 24px;">
                  <a href="https://eydn.app/dashboard/tasks" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">View Tasks</a>
                </p>
              </div>
              <div style="padding: 24px; text-align: center; color: #6B6B6B; font-size: 12px;">
                <p>Eydn — Your AI Wedding Planning Guide</p>
                <p style="margin-top: 8px;">Eydn App, 2921 Landmark Place, Suite 215, Madison, WI 53713</p>
              </div>
            </div>
          `,
        });
        emailsSent++;
      } catch {
        // Don't fail the whole cron if one email fails
      }
    }

    await logCronExecution({
      jobName: "check-deadlines",
      status: "success",
      durationMs: Date.now() - startTime,
      details: { notificationsCreated: totalNotifications, tasksChecked: (tasks || []).length + (overdueTasks || []).length, emailsSent },
    });

    return NextResponse.json({ notifications_created: totalNotifications, emails_sent: emailsSent });
  } catch (error) {
    await logCronExecution({
      jobName: "check-deadlines",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
