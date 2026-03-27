import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const now = new Date();

  // --- Daily signups for last 90 days ---
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: signupData } = await supabase
    .from("weddings")
    .select("created_at")
    .gte("created_at", ninetyDaysAgo.toISOString());

  const dailyMap: Record<string, number> = {};
  // Pre-fill all 90 days with 0
  for (let i = 0; i < 90; i++) {
    const d = new Date(ninetyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap[d.toISOString().split("T")[0]] = 0;
  }
  (signupData || []).forEach((r: { created_at: string }) => {
    const date = r.created_at.split("T")[0];
    if (dailyMap[date] !== undefined) {
      dailyMap[date]++;
    }
  });
  const dailySignups = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Weekly active users (last 12 weeks) ---
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const { data: activityData } = await supabase
    .from("activity_log")
    .select("wedding_id, created_at")
    .gte("created_at", twelveWeeksAgo.toISOString());

  const weeklyMap: Record<string, Set<string>> = {};
  // Pre-fill 12 weeks
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(twelveWeeksAgo);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const label = weekStart.toISOString().split("T")[0];
    weeklyMap[label] = new Set();
  }

  (activityData || []).forEach((r: { wedding_id: string; created_at: string | null }) => {
    if (!r.created_at) return;
    const d = new Date(r.created_at);
    const diffDays = Math.floor((d.getTime() - twelveWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < 12) {
      const weekStart = new Date(twelveWeeksAgo);
      weekStart.setDate(weekStart.getDate() + weekIndex * 7);
      const label = weekStart.toISOString().split("T")[0];
      weeklyMap[label]?.add(r.wedding_id);
    }
  });

  const weeklyActive = Object.entries(weeklyMap)
    .map(([week, ids]) => ({ week, count: ids.size }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // --- Onboarding funnel ---
  const { count: signedUp } = await supabase
    .from("weddings")
    .select("*", { count: "exact", head: true });

  const { count: completedOnboarding } = await supabase
    .from("questionnaire_responses")
    .select("*", { count: "exact", head: true })
    .eq("completed", true);

  const { count: startedOnboarding } = await supabase
    .from("questionnaire_responses")
    .select("*", { count: "exact", head: true });

  // Weddings with at least 1 vendor (exclude deleted)
  const { data: vendorWeddings } = await supabase
    .from("vendors")
    .select("wedding_id")
    .is("deleted_at", null);
  const uniqueVendorWeddings = new Set((vendorWeddings || []).map((r: { wedding_id: string }) => r.wedding_id));

  // Weddings with at least 1 guest (exclude deleted)
  const { data: guestWeddings } = await supabase
    .from("guests")
    .select("wedding_id")
    .is("deleted_at", null);
  const uniqueGuestWeddings = new Set((guestWeddings || []).map((r: { wedding_id: string }) => r.wedding_id));

  const funnel = {
    signedUp: signedUp ?? 0,
    startedOnboarding: startedOnboarding ?? 0,
    completedOnboarding: completedOnboarding ?? 0,
    addedFirstVendor: uniqueVendorWeddings.size,
    addedFirstGuest: uniqueGuestWeddings.size,
  };

  // --- Feature adoption ---
  // Tables with soft delete support
  const SOFT_DELETE_TABLES = new Set(["vendors", "guests", "tasks", "mood_board_items", "seating_tables", "wedding_party"]);

  const featureTables = [
    { table: "vendors", feature: "Vendors" },
    { table: "guests", feature: "Guests" },
    { table: "tasks", feature: "Tasks" },
    { table: "mood_board_items", feature: "Vision Board" },
    { table: "seating_tables", feature: "Seating Chart" },
    { table: "wedding_party", feature: "Wedding Party" },
    { table: "chat_messages", feature: "AI Chat" },
    { table: "day_of_plans", feature: "Day-of Plans" },
    { table: "ceremony_positions", feature: "Ceremony Positions" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const featureAdoption = await Promise.all(
    featureTables.map(async ({ table, feature }) => {
      let query = sb.from(table).select("wedding_id");
      if (SOFT_DELETE_TABLES.has(table)) {
        query = query.is("deleted_at", null);
      }
      const { data } = await query;
      const unique = new Set((data || []).map((r: { wedding_id: string }) => r.wedding_id));
      return { feature, count: unique.size };
    })
  );

  featureAdoption.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    dailySignups,
    weeklyActive,
    funnel,
    featureAdoption,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
