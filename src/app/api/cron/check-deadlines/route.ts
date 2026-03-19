import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Find tasks due in 7 days that don't have notifications yet
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const today = new Date().toISOString().split("T")[0];
  const targetDate = sevenDaysFromNow.toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, wedding_id, title, due_date")
    .eq("completed", false)
    .gte("due_date", today)
    .lte("due_date", targetDate);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ notifications_created: 0 });
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

  const newNotifications = tasks
    .filter((t) => !existingTaskIds.has(t.id))
    .map((t) => ({
      wedding_id: t.wedding_id,
      type: "deadline_reminder",
      title: `Upcoming: ${t.title}`,
      body: `This task is due on ${t.due_date}. Make sure you're on track!`,
      task_id: t.id,
    }));

  if (newNotifications.length > 0) {
    await supabase.from("notifications").insert(newNotifications);
  }

  return NextResponse.json({ notifications_created: newNotifications.length });
}
