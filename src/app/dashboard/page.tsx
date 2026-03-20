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
        <h1>Welcome to eydn</h1>
        <p className="mt-2 text-[15px] text-muted">
          You haven&apos;t set up your wedding yet. Let&apos;s get started.
        </p>
        <a href="/dashboard/onboarding" className="btn-primary mt-6 inline-flex">
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

  const taskPct = (taskCount ?? 0) > 0
    ? Math.round(((completedTasks ?? 0) / (taskCount ?? 0)) * 100)
    : 0;

  return (
    <div>
      {/* eydn welcome */}
      <div className="flex gap-3 items-start mb-8">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center">
          <span className="text-[13px] font-semibold text-white">e</span>
        </div>
        <div className="bg-lavender rounded-[12px] rounded-tl-[4px] px-4 py-3">
          <p className="text-[15px] text-plum">
            {(completedTasks ?? 0) === 0
              ? `Welcome, ${wedding.partner1_name}. I've set up your personalized planning timeline. Let's make your dream wedding happen.`
              : `Looking great, ${wedding.partner1_name}. You've completed ${completedTasks ?? 0} of ${taskCount ?? 0} tasks. Keep it up.`}
          </p>
        </div>
      </div>

      <h1>
        {wedding.partner1_name} & {wedding.partner2_name}
      </h1>
      {wedding.date && (
        <div className="mt-4">
          <p className="text-[15px] text-muted">
            {new Date(wedding.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <div className="mt-3 inline-flex items-baseline gap-2 bg-brand-gradient bg-clip-text text-transparent">
              <span className="text-[48px] font-semibold leading-none" style={{ letterSpacing: "-1px" }}>
                {daysUntilWedding}
              </span>
              <span className="text-[18px] font-semibold">
                days to go
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guests" value={guestCount ?? 0} />
        <StatCard label="Tasks" value={taskCount ?? 0} progress={taskPct} />
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
          <h2>Upcoming tasks</h2>
          <div className="mt-3 space-y-2">
            {(upcomingTasks as { title: string; due_date: string | null; category: string | null; completed: boolean }[]).map((task, i) => {
              const isOverdue =
                task.due_date && new Date(task.due_date) < new Date();
              return (
                <div key={i} className="card-list flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-[15px] text-plum">
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="badge badge-booked">{task.category}</span>
                  )}
                  {task.due_date && (
                    <span className={`text-[12px] ${isOverdue ? "text-error font-semibold" : "text-muted"}`}>
                      {isOverdue ? "Overdue: " : ""}{task.due_date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <a href="/dashboard/tasks" className="mt-3 inline-block text-[15px] text-violet hover:text-soft-violet font-semibold">
            View all tasks →
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, progress }: { label: string; value: string | number; progress?: number }) {
  return (
    <div className="card-summary p-4">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-semibold text-plum">{value}</p>
      {progress !== undefined && (
        <div className="progress-track mt-2">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
