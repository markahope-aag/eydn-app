import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { sendEmail } from "@/lib/email";
import { getEmailPreferences, emailFooterHtml } from "@/lib/email-preferences";
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

    if (!tasks || tasks.length === 0) {
      await logCronExecution({
        jobName: "check-deadlines",
        status: "success",
        durationMs: Date.now() - startTime,
        details: { notificationsCreated: 0, emailsSent: 0 },
      });
      return NextResponse.json({ notifications_created: 0, emails_sent: 0 });
    }

    // Check which tasks already have notifications
    const taskIds = tasks.map((t) => t.id);
    const { data: existing } = await supabase
      .from("notifications")
      .select("task_id")
      .in("task_id", taskIds)
      .eq("type", "deadline_reminder");

    const existingTaskIds = new Set(
      (existing || []).map((n: { task_id: string | null }) => n.task_id)
    );

    const newTasks = tasks.filter((t) => !existingTaskIds.has(t.id));

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

    // Send emails — group tasks by wedding for one email per couple
    const tasksByWedding = new Map<string, Array<{ title: string; due_date: string }>>();
    for (const t of newTasks) {
      const list = tasksByWedding.get(t.wedding_id) || [];
      list.push({ title: t.title, due_date: t.due_date || "" });
      tasksByWedding.set(t.wedding_id, list);
    }

    for (const [weddingId, weddingTasks] of tasksByWedding) {
      try {
        const { data: wedding } = await supabase
          .from("weddings")
          .select("user_id, partner1_name, partner2_name")
          .eq("id", weddingId)
          .single();

        if (!wedding?.user_id) continue;

        // Check email preferences
        const prefs = await getEmailPreferences(weddingId);
        if (prefs.unsubscribed_all || !prefs.deadline_reminders) continue;

        const clerk = await clerkClient();
        const user = await clerk.users.getUser(wedding.user_id);
        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (!userEmail) continue;

        const escapedName = escapeHtml(wedding.partner1_name);
        const taskListHtml = weddingTasks
          .map((t) => `<li><strong>${escapeHtml(t.title)}</strong> — due ${escapeHtml(t.due_date)}</li>`)
          .join("");

        await sendEmail({
          to: userEmail,
          subject: `${wedding.partner1_name} & ${wedding.partner2_name} — ${weddingTasks.length} task${weddingTasks.length > 1 ? "s" : ""} due this week`,
          html: `
            <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; font-size: 24px; margin: 0;">eydn</h1>
              </div>
              <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
                <h2 style="color: #1A1A2E; font-size: 20px;">Upcoming deadlines this week</h2>
                <p>Hi ${escapedName}! You have ${weddingTasks.length} task${weddingTasks.length > 1 ? "s" : ""} coming up:</p>
                <ul style="padding-left: 20px;">${taskListHtml}</ul>
                <p style="text-align: center; margin-top: 24px;">
                  <a href="https://eydn.app/dashboard/tasks" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">View Tasks</a>
                </p>
              </div>
              ${emailFooterHtml(prefs.unsubscribe_token, "deadlines")}
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
      details: { notificationsCreated: newNotifications.length, tasksChecked: tasks.length, emailsSent },
    });

    return NextResponse.json({ notifications_created: newNotifications.length, emails_sent: emailsSent });
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
