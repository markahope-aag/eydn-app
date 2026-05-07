import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { Wedding } from "@/lib/types";
import { formatDueDate } from "@/lib/date-utils";
import Link from "next/link";
import Image from "next/image";
import { MilestoneCelebration } from "@/components/MilestoneCelebration";
import { DayOfReveal } from "@/components/DayOfReveal";
import CatchUpBanner from "@/components/CatchUpBanner";
import { WeddingLocation } from "@/components/WeddingLocation";

function buildGreeting(ctx: { name: string; both: string; days: number | null; totalTasks: number; doneTasks: number; taskPct: number }): string {
  const { name, both, days, totalTasks, doneTasks, taskPct } = ctx;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const pick = <T,>(options: T[]): T => options[dayOfYear % options.length];

  if (doneTasks === 0) {
    return pick([
      `Hey ${name} — your planning journey starts now. There's no wrong place to begin 🌿`,
      `Welcome, ${name}. Everything you need is right here. Let's make this fun.`,
      `So excited for you, ${name}! Your timeline is ready whenever you are 💛`,
    ]);
  }

  if (days !== null && days <= 0) {
    return pick([
      `Today is the day, ${both}. Everything you've planned has led to this moment 💍`,
      `It's here. It's real. It's your wedding day. Soak in every second, ${name} ✨`,
      `${both} — go be married. We'll be here when you get back 💛`,
    ]);
  }

  if (days !== null && days <= 7) {
    return pick([
      `${days} days, ${name}. Take a breath. You've done the work — now enjoy the moment ✨`,
      `Almost there. ${doneTasks} tasks done, and the only one left that matters is saying "I do" 💛`,
      `This week changes everything, ${name}. You are so ready for this.`,
      `Single digits, ${name}! Everything is falling into place. Trust the plan you built 🌿`,
    ]);
  }

  if (days !== null && days <= 30) {
    return pick([
      `${days} days to go, ${name}. The final stretch — and you've got this 💪`,
      `One month out. ${totalTasks - doneTasks} things left on the list, but the hardest part (finding each other) is already done 💛`,
      `${days} days, ${name}. This is the home stretch — and you're crushing it.`,
      `Almost time, ${name}. Deep breath. Everything you've planned is about to come to life ✨`,
    ]);
  }

  if (days !== null && days <= 90) {
    return pick([
      `${days} days out, ${name}. The details are coming together beautifully 🌸`,
      `Three months flies, ${name}. But you're ${taskPct}% done — way ahead of most couples.`,
      `The countdown is real now, ${name}. ${days} days and ${taskPct}% of the way there 💛`,
      `${name}, you're in the sweet spot — far enough to breathe, close enough to feel the excitement ✨`,
    ]);
  }

  if (days !== null && days <= 180) {
    return pick([
      `${days} days to go, ${name}. Every decision you make now shapes the day you'll never forget 🌿`,
      `Half a year out — the big pieces are falling into place, ${name}. Keep going 💛`,
      `${days} days might sound like a lot, but your future self will thank you for starting now, ${name}.`,
      `You're building something beautiful, ${name}. ${doneTasks} decisions down, and each one matters ✨`,
    ]);
  }

  if (days !== null && days <= 365) {
    return pick([
      `${days} days feels far away, but your venue search starts now, ${name} 🌿`,
      `A year of planning ahead — and honestly, ${name}, that's the perfect amount of time.`,
      `${days} days to build the wedding of your dreams, ${name}. No rush, but let's get started 💛`,
      `${name}, a year from now you'll look back and be so glad you started today ✨`,
    ]);
  }

  if (days !== null) {
    return pick([
      `${days} days to go — plenty of time to plan the perfect day, ${name} 🌿`,
      `You're early, ${name} — and that's a superpower. Let's use it wisely 💛`,
      `${days} days of possibility ahead. No stress, just excitement, ${name} ✨`,
      `The best weddings start with time on your side, ${name}. You've got this.`,
    ]);
  }

  if (taskPct >= 75) {
    return pick([
      `${taskPct}% done, ${name}! You're almost there — the finish line is in sight ✨`,
      `Look at you, ${name}. ${doneTasks} tasks done. This wedding is going to be incredible 💛`,
    ]);
  }
  if (taskPct >= 50) {
    return pick([
      `Over halfway there, ${name}. Every checkmark is one step closer to the best day of your life 💛`,
      `${doneTasks} tasks done, ${name}. You're making this look easy ✨`,
    ]);
  }
  return pick([
    `${doneTasks} tasks down, ${name}. Every little step brings you closer to the big day 🌿`,
    `Hey ${name} — you're building something amazing. Keep going 💛`,
    `One step at a time, ${name}. You've got ${doneTasks} done already ✨`,
  ]);
}

export default async function DashboardPage() {
  // Admins go straight to the admin panel
  if (await isAdmin()) redirect("/dashboard/admin");

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

  const [{ count: guestCount }, { count: taskCount }, { count: completedTasks }, { data: upcomingTasks }, { data: allVendors }, { data: allGuests }, { data: overdueTasks }, { data: guidesCompleted }, { data: expensesData }, { data: dayOfPlan }] =
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
      supabase
        .from("day_of_plans")
        .select("id, generated_at")
        .eq("wedding_id", wedding.id)
        .maybeSingle(),
    ]);

  const now = new Date();
  const daysUntilWedding = wedding.date
    ? Math.ceil(
        (new Date(wedding.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Auto-generate day-of plan when ≤14 days out
  let dayOfJustGenerated = false;
  if (daysUntilWedding !== null && daysUntilWedding <= 14 && daysUntilWedding > 0 && !dayOfPlan) {
    try {
      const vendors = await supabase
        .from("vendors")
        .select("name, category, poc_name, poc_phone")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null);
      const party = await supabase
        .from("wedding_party")
        .select("name, role, job_assignment, phone")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null);

      const content = {
        timeline: [
          { time: "8:00 AM", event: "Hair & makeup begins", notes: "" },
          { time: "10:00 AM", event: "Photographer arrives", notes: "" },
          { time: "11:00 AM", event: "Getting ready photos", notes: "" },
          { time: "12:00 PM", event: "Lunch for wedding party", notes: "" },
          { time: "2:00 PM", event: "First look (if applicable)", notes: "" },
          { time: "3:00 PM", event: "Wedding party photos", notes: "" },
          { time: "4:00 PM", event: "Guests arrive", notes: "" },
          { time: "4:30 PM", event: "Ceremony begins", notes: "" },
          { time: "5:00 PM", event: "Cocktail hour", notes: "" },
          { time: "6:00 PM", event: "Reception entrance", notes: "" },
          { time: "6:15 PM", event: "First dance", notes: "" },
          { time: "6:30 PM", event: "Dinner service", notes: "" },
          { time: "7:30 PM", event: "Speeches & toasts", notes: "" },
          { time: "8:00 PM", event: "Cake cutting", notes: "" },
          { time: "8:15 PM", event: "Parent dances", notes: "" },
          { time: "8:30 PM", event: "Open dancing", notes: "" },
          { time: "10:30 PM", event: "Last dance", notes: "" },
          { time: "10:45 PM", event: "Send-off", notes: "" },
        ],
        vendorContacts: (vendors.data || []).map((v: { name: string; category: string; poc_name: string | null; poc_phone: string | null }) => ({
          vendor: v.name, category: v.category, contact: v.poc_name || "", phone: v.poc_phone || "",
        })),
        partyAssignments: (party.data || []).map((p: { name: string; role: string; job_assignment: string | null; phone: string | null }) => ({
          name: p.name, role: p.role, job: p.job_assignment || "", phone: p.phone || "",
        })),
        packingChecklist: [
          "Wedding dress/suit", "Rings", "Vows (if written)", "Marriage license",
          "Emergency kit (sewing kit, stain remover, pain reliever)", "Phone charger",
          "Vendor tips (if applicable)", "Change of clothes for after", "Decor items",
          "Card box / gift table items", "Place cards", "Guestbook & pen",
          "Cake knife & server", "Toasting glasses",
        ],
        ceremonyScript: "", processionalOrder: [], officiantNotes: "",
        music: [], speeches: [], setupTasks: [], attire: [],
      };

      await supabase.from("day_of_plans").upsert({
        wedding_id: wedding.id,
        content: content as unknown as import("@/lib/supabase/types").Json,
        generated_at: new Date().toISOString(),
      });
      dayOfJustGenerated = true;
    } catch {
      // Generation failed — user can still generate manually from the day-of page
    }
  }

  const totalTasks = taskCount ?? 0;
  const doneTasks = completedTasks ?? 0;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const budgetSpent = (expensesData || []).reduce((sum: number, e: { amount_paid: number }) => sum + ((e as { amount_paid: number }).amount_paid || 0), 0);
  const budgetTotal = wedding.budget ?? 0;
  const budgetRemaining = budgetTotal - budgetSpent;

  // Sign couple photo URL if it's a storage path
  let couplePhotoUrl: string | null = null;
  const rawPhotoUrl = (wedding as Record<string, unknown>).website_couple_photo_url as string | null;
  if (rawPhotoUrl) {
    if (rawPhotoUrl.startsWith("http")) {
      couplePhotoUrl = rawPhotoUrl;
    } else {
      const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(rawPhotoUrl, 3600);
      couplePhotoUrl = signed?.signedUrl || null;
    }
  }

  // ─── Greeting message tailored to timeline ──────────────────────────────
  const greeting = buildGreeting({
    name: wedding.partner1_name,
    both: `${wedding.partner1_name} & ${wedding.partner2_name}`,
    days: daysUntilWedding,
    totalTasks,
    doneTasks,
    taskPct,
  });

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

    const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;

    if (pending === 0 && total > 10) {
      nudges.push({
        message: `All ${total} guests have RSVP'd — amazing. Time to finalize your seating chart.`,
        type: "celebrate",
        link: "/dashboard/seating",
      });
    } else if (daysUntilWedding < 45 && pending > 5 && pendingPct > 30) {
      nudges.push({
        message: `${pending} of your ${total} guests haven't RSVP'd yet and the wedding is ${daysUntilWedding} days away. Time to follow up.`,
        type: "urgent",
        link: "/dashboard/guests",
      });
    } else if (accepted > 0 && pending > 0) {
      nudges.push({
        message: `${accepted} ${accepted === 1 ? "person" : "people"} can't wait to celebrate with you — and more RSVPs are still coming in.`,
        type: "tip",
        link: "/dashboard/guests",
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

  // Milestone celebrations are handled by the MilestoneCelebration client component
  // with confetti animation — no duplicate nudges needed here

  // Day-of binder nudge (30-60 days out, plan not yet created)
  if (daysUntilWedding !== null && daysUntilWedding <= 60 && daysUntilWedding > 14 && !dayOfPlan) {
    nudges.push({
      message: `${daysUntilWedding} days out — now is a great time to start your day-of binder. Timeline, vendor contacts, packing list — all in one place.`,
      type: "tip",
      link: "/dashboard/day-of",
    });
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
      {dayOfJustGenerated && daysUntilWedding !== null && (
        <DayOfReveal
          partnerNames={`${wedding.partner1_name} & ${wedding.partner2_name}`}
          daysLeft={daysUntilWedding}
        />
      )}

      <CatchUpBanner />

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
            <p className="text-[15px] text-plum">{greeting}</p>
          </div>
        </div>
      )}

      <MilestoneCelebration taskPct={taskPct} name={wedding.partner1_name} />

      <div className="flex items-start gap-6">
        {/* Couple photo */}
        {couplePhotoUrl ? (
          <div className="hidden sm:block flex-shrink-0 w-24 h-24 rounded-full overflow-hidden relative border-2 border-lavender shadow-sm">
            <Image src={couplePhotoUrl} alt={`${wedding.partner1_name} & ${wedding.partner2_name}`} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <Link
            href="/dashboard/website"
            className="hidden sm:flex flex-shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-border items-center justify-center hover:border-violet hover:bg-lavender/30 transition group"
            title="Add a couple photo on your website page"
          >
            <div className="text-center">
              <svg className="mx-auto text-muted group-hover:text-violet transition" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[9px] text-muted group-hover:text-violet transition mt-0.5 block">Add photo</span>
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <h1>
            {wedding.partner1_name} & {wedding.partner2_name}
          </h1>
          <WeddingLocation
            weddingId={wedding.id}
            initialCity={(wedding as { venue_city: string | null }).venue_city}
          />
          {wedding.date && (
            <div className="mt-2">
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
                  <CountdownBar weddingDate={wedding.date} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Things Eydn Should Know */}
      <div className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-semibold text-plum">Things Eydn Should Know</h2>
          <Link href="/dashboard/settings" className="text-[12px] text-violet hover:text-plum transition">Edit</Link>
        </div>
        {wedding.key_decisions ? (
          <p className="text-[13px] text-muted leading-relaxed line-clamp-3">{wedding.key_decisions}</p>
        ) : (
          <div className="text-center py-4">
            <p className="text-[13px] text-muted">Tell Eydn about your wedding preferences, allergies, must-haves, and key decisions.</p>
            <Link href="/dashboard/settings" className="text-[13px] text-violet font-semibold mt-2 inline-block">Add Notes &rarr;</Link>
          </div>
        )}
        <p className="text-[11px] text-muted mt-2">These notes shape every conversation with your AI planning assistant.</p>
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
                <div key={i} className="card-list px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot[task.priority] || priorityDot.medium}`} title={`${task.priority} priority`} />
                    <span className="flex-1 text-[15px] text-plum truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-[18px]">
                    {task.category && (
                      <span className="badge badge-booked text-[11px]">{task.category}</span>
                    )}
                    {dueDateInfo && (
                      <span className={`text-[12px] ${isOverdue ? "text-error font-semibold" : dueDateInfo.isToday ? "text-violet font-semibold" : "text-muted"}`}>
                        {dueDateInfo.formatted} · {dueDateInfo.relative}
                      </span>
                    )}
                  </div>
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
