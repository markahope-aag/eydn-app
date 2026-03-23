import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { formatDueDate } from "@/lib/date-utils";

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
        <h1>Welcome to Eydn</h1>
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

  const now = new Date();
  const daysUntilWedding = wedding.date
    ? Math.ceil(
        (new Date(wedding.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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
            <div
              className="mt-3 inline-flex items-baseline gap-2"
              style={{
                background: "linear-gradient(135deg, var(--violet), var(--soft-violet))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
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
        {/* Progress Ring */}
        <div className="card-summary p-4 flex flex-col items-center justify-center">
          <ProgressRing percentage={taskPct} />
          <p className="mt-2 text-[13px] font-semibold text-muted">Planning Progress</p>
        </div>
        <StatCard label="Guests" value={guestCount ?? 0} />
        <StatCard
          label="Tasks"
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
              const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;
              const isOverdue = dueDateInfo?.isOverdue;
              return (
                <div key={i} className="card-list flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-[15px] text-plum">
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="badge badge-booked">{task.category}</span>
                  )}
                  {dueDateInfo && (
                    <span className={`text-[12px] ${isOverdue ? "text-error font-semibold" : dueDateInfo.isToday ? "text-violet font-semibold" : "text-muted"}`}>
                      {dueDateInfo.formatted} &middot; {dueDateInfo.relative}
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

      {/* Recent Activity */}
      <RecentActivity weddingId={wedding.id} />
    </div>
  );
}

async function RecentActivity({ weddingId }: { weddingId: string }) {
  const supabase = createSupabaseAdmin();

  const [{ data: activityData }, { data: commentsData }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("action, entity_type, entity_name, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("comments")
      .select("user_name, content, entity_type, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type FeedItem = { type: "activity" | "comment"; text: string; time: string };
  const feed: FeedItem[] = [];

  for (const a of activityData || []) {
    feed.push({
      type: "activity",
      text: `${a.action === "create" ? "Added" : a.action === "update" ? "Updated" : a.action === "delete" ? "Removed" : "Restored"} ${a.entity_type.replace(/_/g, " ")}${a.entity_name ? `: ${a.entity_name}` : ""}`,
      time: a.created_at,
    });
  }
  for (const c of commentsData || []) {
    feed.push({
      type: "comment",
      text: `${c.user_name} commented on ${c.entity_type}: "${(c.content as string).slice(0, 60)}${(c.content as string).length > 60 ? "..." : ""}"`,
      time: c.created_at,
    });
  }

  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const recent = feed.slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="mt-8">
      <h2>Recent Activity</h2>
      <div className="mt-3 space-y-1">
        {recent.map((item, i) => (
          <div key={i} className="card-list flex items-center gap-3 px-4 py-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.type === "comment" ? "bg-violet" : "bg-petal"}`} />
            <span className="text-[14px] text-plum flex-1">{item.text}</span>
            <span className="text-[11px] text-muted flex-shrink-0">
              {new Date(item.time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ percentage }: { percentage: number }) {
  const size = 120;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percentage / 100) * circumference;
  const offset = circumference - filled;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Gradient definition */}
      <defs>
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2C3E2D" />
          <stop offset="100%" stopColor="#D4A5A5" />
        </linearGradient>
      </defs>
      {/* Background ring */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--lavender, #F0E6FA)"
        strokeWidth={strokeWidth}
      />
      {/* Filled ring */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#ring-gradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Percentage text */}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize="28"
        fontWeight="600"
        fill="var(--plum, #3D2252)"
      >
        {percentage}%
      </text>
      <text
        x={cx} y={cy + 16}
        textAnchor="middle"
        fontSize="10"
        fill="var(--muted, #8E7A9E)"
      >
        complete
      </text>
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-summary p-4">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-semibold text-plum">{value}</p>
    </div>
  );
}
