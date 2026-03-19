import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

export default async function DashboardPage() {
  const { userId } = await auth();

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("weddings")
    .select()
    .eq("user_id", userId!)
    .single();

  const wedding = data as Wedding | null;

  if (!wedding) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
        <p className="mt-2 text-gray-600">
          You haven&apos;t set up your wedding yet. Let&apos;s get started.
        </p>
        <a
          href="/dashboard/onboarding"
          className="mt-6 inline-block rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Set Up Your Wedding
        </a>
      </div>
    );
  }

  const [{ count: guestCount }, { count: taskCount }, { count: completedTasks }, { data: upcomingTasks }] =
    await Promise.all([
      supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id)
        .eq("completed", true),
      supabase
        .from("tasks")
        .select("title, due_date, category, completed")
        .eq("wedding_id", wedding.id)
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
    ]);

  const daysUntilWedding = wedding.date
    ? Math.ceil(
        (new Date(wedding.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div>
      {/* Eydn welcome */}
      <div className="flex gap-3 items-start mb-8">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
          <span className="text-sm font-bold text-rose-600">E</span>
        </div>
        <div className="bg-rose-50 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-gray-700">
            {completedTasks === 0
              ? `Welcome, ${wedding.partner1_name}! I've set up your personalized planning timeline. Let's make your dream wedding happen!`
              : `Looking great, ${wedding.partner1_name}! You've completed ${completedTasks ?? 0} of ${taskCount ?? 0} tasks. Keep up the amazing work!`}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        {wedding.partner1_name} & {wedding.partner2_name}
      </h1>
      {wedding.date && (
        <p className="mt-1 text-gray-500">
          {new Date(wedding.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <span className="ml-2 text-rose-600 font-medium">
              ({daysUntilWedding} days away)
            </span>
          )}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guests" value={guestCount ?? 0} />
        <StatCard label="Tasks" value={taskCount ?? 0} />
        <StatCard
          label="Completed"
          value={`${completedTasks ?? 0}/${taskCount ?? 0}`}
        />
        <StatCard
          label="Budget"
          value={wedding.budget ? `$${wedding.budget.toLocaleString()}` : "Not set"}
        />
      </div>

      {/* Upcoming tasks */}
      {upcomingTasks && upcomingTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
          <div className="mt-3 space-y-2">
            {(upcomingTasks as { title: string; due_date: string | null; category: string | null; completed: boolean }[]).map((task, i) => {
              const isOverdue =
                task.due_date && new Date(task.due_date) < new Date();
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
                >
                  <span className="flex-1 text-sm text-gray-900">
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {task.category}
                    </span>
                  )}
                  {task.due_date && (
                    <span
                      className={`text-xs ${
                        isOverdue ? "text-red-500 font-medium" : "text-gray-400"
                      }`}
                    >
                      {isOverdue ? "Overdue: " : ""}
                      {task.due_date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <a
            href="/dashboard/tasks"
            className="mt-3 inline-block text-sm text-rose-600 hover:text-rose-500 font-medium"
          >
            View all tasks →
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
