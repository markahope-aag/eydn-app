import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // --- Directory stats (suggested_vendors) — exclude seed data ---
  // Seed vendors have example.com websites or (555) phone numbers
  const seedFilter = "website.neq.https://example.com";

  const [
    { count: totalDirectory },
    { count: activeDirectory },
    { count: featuredDirectory },
  ] = await Promise.all([
    supabase.from("suggested_vendors").select("*", { count: "exact", head: true }).not("website", "eq", "https://example.com"),
    supabase.from("suggested_vendors").select("*", { count: "exact", head: true }).eq("active", true).not("website", "eq", "https://example.com"),
    supabase.from("suggested_vendors").select("*", { count: "exact", head: true }).eq("featured", true).not("website", "eq", "https://example.com"),
  ]);

  const { data: byCategoryDir } = await supabase
    .from("suggested_vendors")
    .select("category")
    .not("website", "eq", "https://example.com");

  const categoryMap: Record<string, number> = {};
  (byCategoryDir || []).forEach((r: { category: string }) => {
    const cat = r.category || "Unknown";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const byCategory = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const { data: byStateDir } = await supabase
    .from("suggested_vendors")
    .select("state")
    .not("website", "eq", "https://example.com");

  const stateMap: Record<string, number> = {};
  (byStateDir || []).forEach((r: { state: string }) => {
    const st = r.state || "Unknown";
    stateMap[st] = (stateMap[st] || 0) + 1;
  });
  const byState = Object.entries(stateMap)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  const { data: byPriceDir } = await supabase
    .from("suggested_vendors")
    .select("price_range")
    .not("website", "eq", "https://example.com");

  const priceMap: Record<string, number> = {};
  (byPriceDir || []).forEach((r: { price_range: string | null }) => {
    const range = r.price_range || "Not specified";
    priceMap[range] = (priceMap[range] || 0) + 1;
  });
  const byPriceRange = Object.entries(priceMap)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => b.count - a.count);

  // --- Usage stats (vendors table — what couples actually book) ---
  const { count: totalBookings } = await supabase
    .from("vendors")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  const { data: usageCatData } = await supabase
    .from("vendors")
    .select("category")
    .is("deleted_at", null);

  const usageCatMap: Record<string, number> = {};
  (usageCatData || []).forEach((r: { category: string }) => {
    const cat = r.category || "Unknown";
    usageCatMap[cat] = (usageCatMap[cat] || 0) + 1;
  });
  const usageByCategory = Object.entries(usageCatMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const { data: usageNameData } = await supabase
    .from("vendors")
    .select("name, category")
    .is("deleted_at", null);

  const nameMap: Record<string, { name: string; category: string; count: number }> = {};
  (usageNameData || []).forEach((r: { name: string; category: string }) => {
    const key = `${r.name}|||${r.category}`;
    if (!nameMap[key]) {
      nameMap[key] = { name: r.name || "Unnamed", category: r.category || "Unknown", count: 0 };
    }
    nameMap[key].count++;
  });
  const topVendorNames = Object.values(nameMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const { data: usageStatusData } = await supabase
    .from("vendors")
    .select("status")
    .is("deleted_at", null);

  const statusMap: Record<string, number> = {};
  (usageStatusData || []).forEach((r: { status: string }) => {
    const st = r.status || "unknown";
    statusMap[st] = (statusMap[st] || 0) + 1;
  });
  const byStatus = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Average vendors per wedding
  const { data: weddingVendorCounts } = await supabase
    .from("vendors")
    .select("wedding_id")
    .is("deleted_at", null);

  const weddingMap: Record<string, number> = {};
  (weddingVendorCounts || []).forEach((r: { wedding_id: string }) => {
    weddingMap[r.wedding_id] = (weddingMap[r.wedding_id] || 0) + 1;
  });
  const weddingCount = Object.keys(weddingMap).length;
  const averagePerWedding = weddingCount > 0
    ? Math.round(((totalBookings ?? 0) / weddingCount) * 10) / 10
    : 0;

  // --- Vendor accounts ---
  const [
    { count: totalAccounts },
    { count: pendingAccounts },
    { count: approvedAccounts },
    { count: suspendedAccounts },
  ] = await Promise.all([
    (supabase as any).from("vendor_accounts").select("*", { count: "exact", head: true }),
    (supabase as any).from("vendor_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    (supabase as any).from("vendor_accounts").select("*", { count: "exact", head: true }).eq("status", "approved"),
    (supabase as any).from("vendor_accounts").select("*", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  // --- Placements ---
  const { data: activePlacementsData } = await (supabase as any)
    .from("vendor_placements")
    .select("id, tier_id, placement_tiers(name, price_monthly)")
    .eq("status", "active");

  const activePlacements = (activePlacementsData || []).length;
  let mrr = 0;
  const tierMap: Record<string, { tier: string; count: number; revenue: number }> = {};
  (activePlacementsData || []).forEach((p: any) => {
    const tierName = p.placement_tiers?.name || "Unknown";
    const price = p.placement_tiers?.price_monthly || 0;
    mrr += price;
    if (!tierMap[tierName]) {
      tierMap[tierName] = { tier: tierName, count: 0, revenue: 0 };
    }
    tierMap[tierName].count++;
    tierMap[tierName].revenue += price;
  });
  const byTier = Object.values(tierMap).sort((a, b) => b.revenue - a.revenue);

  // --- Submissions ---
  const [
    { count: pendingSubs },
    { count: approvedSubs },
    { count: rejectedSubs },
  ] = await Promise.all([
    (supabase as any).from("vendor_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    (supabase as any).from("vendor_submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
    (supabase as any).from("vendor_submissions").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  return NextResponse.json({
    directory: {
      total: totalDirectory ?? 0,
      active: activeDirectory ?? 0,
      featured: featuredDirectory ?? 0,
      byCategory,
      byState,
      byPriceRange,
    },
    usage: {
      totalBookings: totalBookings ?? 0,
      byCategory: usageByCategory,
      topVendorNames,
      byStatus,
      averagePerWedding,
    },
    accounts: {
      total: totalAccounts ?? 0,
      pending: pendingAccounts ?? 0,
      approved: approvedAccounts ?? 0,
      suspended: suspendedAccounts ?? 0,
    },
    placements: {
      activePlacements,
      mrr,
      byTier,
    },
    submissions: {
      pending: pendingSubs ?? 0,
      approved: approvedSubs ?? 0,
      rejected: rejectedSubs ?? 0,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
