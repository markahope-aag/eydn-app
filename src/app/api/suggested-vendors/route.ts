import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("suggested_vendors")
    .select()
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);
  if (city) query = query.ilike("city", `%${city}%`);
  if (state) query = query.eq("state", state);

  const { data, error } = await query;

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Sort: Premium placements first, then Featured, then free, then non-placed
  type SuggestedVendor = { placement_tier: string | null; placement_expires_at: string | null; featured: boolean; [key: string]: unknown };
  const tierOrder: Record<string, number> = { Premium: 0, Featured: 1, Basic: 2 };
  const rows = (data || []) as SuggestedVendor[];

  const sorted = rows.sort((a, b) => {
    const aActive = a.placement_tier && a.placement_expires_at && new Date(a.placement_expires_at) > new Date();
    const bActive = b.placement_tier && b.placement_expires_at && new Date(b.placement_expires_at) > new Date();

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      const aOrder = tierOrder[a.placement_tier!] ?? 99;
      const bOrder = tierOrder[b.placement_tier!] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }
    // Featured (preferred) vendors next
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Track impressions for vendors with active placements
  const vendorAccountIds = sorted
    .filter((v) => (v as unknown as { vendor_account_id?: string }).vendor_account_id)
    .map((v) => ({
      vendor_account_id: (v as unknown as { vendor_account_id: string }).vendor_account_id,
      event_type: "impression" as const,
    }));

  if (vendorAccountIds.length > 0) {
    supabase.from("vendor_analytics").insert(vendorAccountIds).then(({ error }) => { if (error) console.error("[ANALYTICS]", error.message); });
  }

  return NextResponse.json(sorted, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
  });
}
