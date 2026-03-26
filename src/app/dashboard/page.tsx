import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { formatDueDate } from "@/lib/date-utils";
import Link from "next/link";

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
          Set up your wedding and Eydn will build your planning timeline.
        </p>
        <a href="/dashboard/onboarding" className="btn-primary mt-6 inline-flex">
          Set Up Your Wedding
        </a>
      </div>
    );
  }

  const [{ count: guestCount }, { count: taskCount }, { count: completedTasks }, { data: upcomingTasks }, { data: allVendors }, { data: allGuests }, { data: overdueTasks }, { data: guidesCompleted }, { data: expensesData }] =
    await Promise.all([
      supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id)
        .eq("completed", true)
        .is("deleted_at", null),
      supabase
        .from("tasks")
        .select("title, due_date, category, completed, priority")
        .eq("wedding_id", wedding.id)
        .eq("completed", false)
        .is("deleted_at", null)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
      supabase
        .from("vendors")
        .select("name, category, status")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null),
      supabase
        .from("guests")
        .select("rsvp_status")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null),
      supabase
        .from("tasks")
        .select("title, due_date")
        .eq("wedding_id", wedding.id)
        .eq("completed", false)
        .is("deleted_at", null)
        .lt("due_date", new Date().toISOString().split("T")[0])
        .not("due_date", "is", null),
      supabase
        .from("guide_responses")
        .select("guide_slug")
        .eq("wedding_id", wedding.id)
        .eq("completed", true),
      supabase
        .from("expenses")
        .select("amount_paid")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null),
    ]);

  const now = new Date();
  const daysUntilWedding = wedding.date
    ? Math.ceil(
        (new Date(wedding.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const totalTasks = taskCount ?? 0;
  const doneTasks = completedTasks ?? 0;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const budgetSpent = (expensesData || []).reduce((sum: number, e: { amount_paid: number }) => sum + ((e as { amount_paid: number }).amount_paid || 0), 0);
  const budgetTotal = wedding.budget ?? 0;
  const budgetRemaining = budgetTotal - budgetSpent;

  // ─── Greeting message tailored to timeline ──────────────────────────────
  function getGreeting(): string {
    const name = wedding!.partner1_name;
    if (doneTasks === 0) {
      return `Hey ${name} — your planning timeline is ready. Start with whatever feels most pressing.`;
    }
    if (daysUntilWedding !== null && daysUntilWedding <= 7) {
      return `It's almost here, ${name}. ${doneTasks} of ${totalTasks} tasks done. Take a breath — you've got this.`;
    }
    if (daysUntilWedding !== null && daysUntilWedding <= 30) {
      return `The final stretch, ${name}. ${totalTasks - doneTasks} tasks left and ${daysUntilWedding} days to go.`;
    }
    if (taskPct >= 75) {
      return `You're in great shape, ${name}. ${taskPct}% done with ${daysUntilWedding ? `${daysUntilWedding} days` : "plenty of time"} to go.`;
    }
    if (taskPct >= 50) {
      return `Over halfway there, ${name}. ${doneTasks} of ${totalTasks} tasks checked off. Here's what's coming up.`;
    }
    if (taskPct >= 25) {
      return `Good momentum, ${name}. ${doneTasks} tasks done so far. Here's what's next.`;
    }
    return `${doneTasks} of ${totalTasks} tasks done, ${name}. Here's what's coming up.`;
  }

  // ─── Generate proactive nudges ──────────────────────────────────────────
  const nudges: { message: string; type: "urgent" | "tip" | "celebrate"; link?: string }[] = [];

  // Overdue tasks
  const overdueCount = overdueTasks?.length ?? 0;
  if (overdueCount > 0) {
    const names = (overdueTasks as { title: string }[]).slice(0, 2).map((t) => t.title).join(" and ");
    nudges.push({
      message: overdueCount === 1
        ? `"${names}" is past due — let's get that checked off!`
        : `You have ${overdueCount} overdue tasks — ${names}${overdueCount > 2 ? ` and ${overdueCount - 2} more` : ""}. Let's catch up!`,
      type: "urgent",
      link: "/dashboard/tasks",
    });
  }

  // Vendor gaps — key categories not yet booked
  const vendorCategories = (allVendors || []).map((v) => (v as { category: string }).category);
  const vendorStatuses = (allVendors || []).reduce((acc, v) => {
    const vendor = v as { category: string; status: string };
    if (["booked", "deposit_paid", "paid_in_full"].includes(vendor.status)) {
      acc.add(vendor.category);
    }
    return acc;
  }, new Set<string>());

  const essentialVendors = ["Venue", "Photographer", "Caterer", "DJ or Band", "Officiant", "Florist"];
  const missingVendors = essentialVendors.filter((v) => !vendorStatuses.has(v) && !vendorCategories.includes(v));
  if (missingVendors.length > 0 && daysUntilWedding !== null && daysUntilWedding < 180) {
    const missing = missingVendors.slice(0, 3).join(", ");
    nudges.push({
      message: `You haven't added a ${missing} yet — these typically book 8-10 months out. Worth looking into soon!`,
      type: "tip",
      link: "/dashboard/vendors",
    });
  }

  // RSVP nudges
  if (allGuests && allGuests.length > 0 && daysUntilWedding !== null) {
    const guests = allGuests as { rsvp_status: string }[];
    const pending = guests.filter((g) => !["accepted", "declined"].includes(g.rsvp_status)).length;
    const total = guests.length;
    const pendingPct = Math.round((pending / total) * 100);

    if (daysUntilWedding < 45 && pending > 5 && pendingPct > 30) {
      nudges.push({
        message: `${pending} of your ${total} guests haven't RSVP'd yet and the wedding is ${daysUntilWedding} days away. Time to follow up!`,
        type: "urgent",
        link: "/dashboard/guests",
      });
    } else if (pending === 0 && total > 10) {
      nudges.push({
        message: `All ${total} guests have RSVP'd — amazing! Time to finalize your seating chart.`,
        type: "celebrate",
        link: "/dashboard/seating",
      });
    }
  }

  // Planning guide suggestions
  const completedGuides = new Set((guidesCompleted || []).map((g) => (g as { guide_slug: string }).guide_slug));
  const guideNudges: Record<string, { condition: boolean; message: string }> = {
    "guest-list": { condition: (guestCount ?? 0) === 0, message: "Not sure where to start with your guest list? Our Guest List Guide walks you through it step by step." },
    "colors-theme": { condition: !wedding.style_description, message: "Haven't nailed down your colors yet? The Colors & Theme Guide helps you define your aesthetic." },
    "florist": { condition: !vendorStatuses.has("Florist") && vendorCategories.includes("Florist"), message: "You have a florist on your list but haven't finalized details. The Florist Guide helps you build a vendor brief." },
    "music": { condition: !vendorStatuses.has("DJ or Band") && (daysUntilWedding ?? 999) < 180, message: "Still figuring out music? Our Music Guide helps you plan ceremony and reception music, plus generates a DJ brief." },
  };

  for (const [slug, nudge] of Object.entries(guideNudges)) {
    if (!completedGuides.has(slug) && nudge.condition && nudges.length < 4) {
      nudges.push({
        message: nudge.message,
        type: "tip",
        link: slug === "guest-list" ? "/dashboard/guides/guest-list" : `/dashboard/guides/${slug}`,
      });
    }
  }

  // Milestone celebrations
  if (taskPct >= 50 && taskPct < 75 && doneTasks > 5) {
    nudges.push({ message: `You're over halfway done with your planning tasks — ${taskPct}% complete! You're crushing it.`, type: "celebrate" });
  } else if (taskPct >= 75 && taskPct < 100) {
    nudges.push({ message: `${taskPct}% of tasks done — you're in the home stretch! Almost everything is locked in.`, type: "celebrate" });
  } else if (taskPct === 100 && totalTasks > 10) {
    nudges.push({ message: "Every single task is done. You're officially the most organized couple ever. Enjoy your day!", type: "celebrate" });
  }

  // Budget check
  if (budgetTotal > 0) {
    const budgetUsed = Math.round((budgetSpent / budgetTotal) * 100);
    if (budgetUsed > 90 && budgetUsed < 100) {
      nudges.push({ message: `You've spent ${budgetUsed}% of your budget — getting close to the limit. Keep an eye on remaining expenses.`, type: "urgent", link: "/dashboard/budget" });
    } else if (budgetSpent > budgetTotal) {
      nudges.push({ message: `You're over budget by $${(budgetSpent - budgetTotal).toLocaleString()}. Let's review your expenses and see where to trim.`, type: "urgent", link: "/dashboard/budget" });
    }
  }

  // Limit to top 3 nudges, prioritized: urgent > tip > celebrate
  const sortedNudges = nudges
    .sort((a, b) => {
      const order = { urgent: 0, tip: 1, celebrate: 2 };
      return order[a.type] - order[b.type];
    })
    .slice(0, 3);

  // Priority indicators for tasks
  const priorityDot: Record<string, string> = {
    high: "bg-error",
    medium: "bg-[#D4A017]",
    low: "bg-transparent border border-border",
  };

  return (
    <div>
      {/* Proactive nudges from Eydn */}
      {sortedNudges.length > 0 && (
        <div className="mb-8 space-y-2">
          {sortedNudges.map((nudge, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                nudge.type === "urgent" ? "bg-error/10" : nudge.type === "celebrate" ? "bg-violet/10" : "bg-brand-gradient"
              }`}>
                <span className={`text-[13px] font-semibold ${
                  nudge.type === "urgent" ? "text-error" : nudge.type === "celebrate" ? "text-violet" : "text-white"
                }`}>
                  {nudge.type === "urgent" ? "!" : nudge.type === "celebrate" ? "★" : "e"}
                </span>
              </div>
              <div className={`rounded-[12px] rounded-tl-[4px] px-4 py-3 flex-1 ${
                nudge.type === "urgent" ? "bg-error/5 border border-error/20" : "bg-lavender"
              }`}>
                <p className="text-[14px] text-plum">{nudge.message}</p>
                {nudge.link && (
                  <a href={nudge.link} className="text-[12px] font-semibold text-violet hover:text-soft-violet mt-1 inline-block">
                    Take action →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* eydn welcome (only show if no nudges) */}
      {sortedNudges.length === 0 && (
        <div className="flex gap-3 items-start mb-8">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center">
            <span className="text-[13px] font-semibold text-white">e</span>
          </div>
          <div className="bg-lavender rounded-[12px] rounded-tl-[4px] px-4 py-3">
            <p className="text-[15px] text-plum">{getGreeting()}</p>
          </div>
        </div>
      )}

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
            <div className="mt-3">
              <div
                className="inline-flex items-baseline gap-2"
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
              {/* Progress bar toward wedding date */}
              <CountdownBar weddingDate={wedding.date} />
            </div>
          )}
        </div>
      )}

      {/* Stats — Progress ring is larger and more prominent */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-summary p-6 flex flex-col items-center justify-center sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <ProgressRing percentage={taskPct} />
          <p className="mt-3 text-[14px] font-semibold text-plum">Planning Progress</p>
          <p className="text-[12px] text-muted">{doneTasks} of {totalTasks} tasks</p>
        </div>
        <StatCard label="Guests" value={guestCount ?? 0} href="/dashboard/guests" />
        <StatCard
          label="Tasks"
          value={`${doneTasks}/${totalTasks}`}
          href="/dashboard/tasks"
        />
        {budgetTotal > 0 ? (
          <div className="card-summary p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-muted">Budget</p>
              <Link href="/dashboard/budget" className="text-[11px] text-violet hover:text-soft-violet font-semibold">View →</Link>
            </div>
            <p className="mt-1 text-[22px] font-semibold text-plum">${budgetSpent.toLocaleString()}</p>
            <p className="text-[12px] text-muted">
              of ${budgetTotal.toLocaleString()} total
              {budgetRemaining >= 0
                ? ` · $${budgetRemaining.toLocaleString()} remaining`
                : ` · $${Math.abs(budgetRemaining).toLocaleString()} over`}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-lavender overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetSpent > budgetTotal ? "bg-error" : "bg-violet"}`}
                style={{ width: `${Math.min(100, budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0)}%` }}
              />
            </div>
          </div>
        ) : (
          <StatCard label="Budget" value="Not set" href="/dashboard/budget" />
        )}
      </div>

      {/* Quick-add buttons */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link href="/dashboard/tasks" className="btn-ghost btn-sm flex items-center gap-1.5">
          <span className="text-violet">+</span> Add Task
        </Link>
        <Link href="/dashboard/guests" className="btn-ghost btn-sm flex items-center gap-1.5">
          <span className="text-violet">+</span> Add Guest
        </Link>
        <Link href="/dashboard/vendors" className="btn-ghost btn-sm flex items-center gap-1.5">
          <span className="text-violet">+</span> Add Vendor
        </Link>
      </div>

      {/* Upcoming tasks — sorted by urgency with priority indicators */}
      {upcomingTasks && upcomingTasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2>Upcoming tasks</h2>
            <Link href="/dashboard/tasks" className="text-[13px] text-violet hover:text-soft-violet font-semibold">
              View all →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {(upcomingTasks as { title: string; due_date: string | null; category: string | null; completed: boolean; priority: string }[]).map((task, i) => {
              const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;
              const isOverdue = dueDateInfo?.isOverdue;
              return (
                <div key={i} className="card-list flex items-center gap-3 px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot[task.priority] || priorityDot.medium}`} title={`${task.priority} priority`} />
                  <span className="flex-1 text-[15px] text-plum">
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="badge badge-booked">{task.category}</span>
                  )}
                  {dueDateInfo && (
                    <span className={`text-[12px] flex-shrink-0 ${isOverdue ? "text-error font-semibold" : dueDateInfo.isToday ? "text-violet font-semibold" : "text-muted"}`}>
                      {dueDateInfo.formatted} · {dueDateInfo.relative}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <RecentActivity weddingId={wedding.id} />
    </div>
  );
}

function CountdownBar({ weddingDate }: { weddingDate: string }) {
  const now = new Date();
  const wedding = new Date(weddingDate);
  const totalDays = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Assume ~18 month engagement as baseline (540 days)
  // If wedding is further out, use actual distance
  const totalSpan = Math.max(totalDays, 540);
  const elapsed = totalSpan - totalDays;
  const pct = Math.min(100, Math.max(0, (elapsed / totalSpan) * 100));

  return (
    <div className="mt-2 max-w-[220px]">
      <div className="h-1.5 rounded-full bg-lavender overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(135deg, var(--violet), var(--soft-violet))",
            transition: "width 0.6s ease",
          }}
        />
      </div>
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
      time: a.created_at ?? new Date().toISOString(),
    });
  }
  for (const c of commentsData || []) {
    feed.push({
      type: "comment",
      text: `${c.user_name} commented on ${c.entity_type}: "${(c.content as string).slice(0, 60)}${(c.content as string).length > 60 ? "..." : ""}"`,
      time: c.created_at ?? new Date().toISOString(),
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
  const size = 140;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percentage / 100) * circumference;
  const offset = circumference - filled;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2C3E2D" />
          <stop offset="100%" stopColor="#D4A5A5" />
        </linearGradient>
      </defs>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--lavender, #F0E6FA)"
        strokeWidth={strokeWidth}
      />
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
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize="32"
        fontWeight="600"
        fill="var(--plum, #3D2252)"
      >
        {percentage}%
      </text>
      <text
        x={cx} y={cy + 18}
        textAnchor="middle"
        fontSize="11"
        fill="var(--muted, #8E7A9E)"
      >
        complete
      </text>
    </svg>
  );
}

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        {href && <span className="text-[11px] text-violet font-semibold">View →</span>}
      </div>
      <p className="mt-1 text-[26px] font-semibold text-plum">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card-summary p-4 hover:border-violet/30 transition-colors">
        {content}
      </Link>
    );
  }

  return <div className="card-summary p-4">{content}</div>;
}
