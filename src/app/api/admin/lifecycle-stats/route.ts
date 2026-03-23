import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Phase counts, memory plan stats, and upcoming sunsets in parallel
  const [
    { count: activeCount },
    { count: postWeddingCount },
    { count: archivedCount },
    { count: sunsetCount },
    { count: memoryPlanCount },
    { data: emailStats },
    { data: upcomingSunsets },
    { count: totalWeddings },
  ] = await Promise.all([
    supabase.from("weddings").select("*", { count: "exact", head: true }).eq("phase", "active"),
    supabase.from("weddings").select("*", { count: "exact", head: true }).eq("phase", "post_wedding"),
    supabase.from("weddings").select("*", { count: "exact", head: true }).eq("phase", "archived"),
    supabase.from("weddings").select("*", { count: "exact", head: true }).eq("phase", "sunset"),
    supabase.from("weddings").select("*", { count: "exact", head: true }).eq("memory_plan_active", true),
    // Count emails sent by type
    supabase.from("lifecycle_emails").select("email_type"),
    // Weddings approaching sunset (archived without memory plan, wedding date 18+ months ago)
    supabase
      .from("weddings")
      .select("id, partner1_name, partner2_name, date, phase, memory_plan_active, created_at")
      .eq("phase", "archived")
      .eq("memory_plan_active", false)
      .not("date", "is", null)
      .order("date", { ascending: true })
      .limit(20),
    supabase.from("weddings").select("*", { count: "exact", head: true }),
  ]);

  // Aggregate email counts by type
  const emailCounts: Record<string, number> = {};
  for (const row of emailStats || []) {
    const t = (row as { email_type: string }).email_type;
    emailCounts[t] = (emailCounts[t] || 0) + 1;
  }

  // Calculate months until sunset for upcoming weddings
  const now = new Date();
  const sunsetList = (upcomingSunsets || []).map((w) => {
    const weddingDate = new Date((w as { date: string }).date);
    const monthsSince = (now.getTime() - weddingDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const monthsUntilSunset = Math.max(0, 24 - monthsSince);
    return {
      id: (w as { id: string }).id,
      partner1_name: (w as { partner1_name: string }).partner1_name,
      partner2_name: (w as { partner2_name: string }).partner2_name,
      wedding_date: (w as { date: string }).date,
      months_until_sunset: Math.round(monthsUntilSunset * 10) / 10,
    };
  }).filter((w) => w.months_until_sunset <= 6);

  return NextResponse.json({
    phases: {
      active: activeCount ?? 0,
      post_wedding: postWeddingCount ?? 0,
      archived: archivedCount ?? 0,
      sunset: sunsetCount ?? 0,
    },
    total_weddings: totalWeddings ?? 0,
    memory_plan_subscribers: memoryPlanCount ?? 0,
    emails_sent: emailCounts,
    upcoming_sunsets: sunsetList,
  });
}
