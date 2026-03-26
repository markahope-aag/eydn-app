import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");
  const q = url.searchParams.get("q");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || String(PAGE_SIZE), 10)));

  const supabase = createSupabaseAdmin();

  // Build query with server-side filtering
  let query = supabase
    .from("suggested_vendors")
    .select("*", { count: "exact" })
    .eq("active", true);

  if (category) query = query.eq("category", category);
  if (state) query = query.eq("state", state);
  if (city) query = query.ilike("city", `%${city}%`);

  // Text search — use Postgres full-text search for speed at scale,
  // with ILIKE OR fallback for partial/fuzzy matches
  if (q && q.trim()) {
    const term = q.trim();
    // Full-text search with OR on ILIKE for partial matches (e.g. "Aust" → "Austin")
    query = query.or(
      `search_vector.fts.${term},name.ilike.%${term}%,city.ilike.%${term}%`
    );
  }

  // Order: featured first, then alphabetical
  query = query
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[API]", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Sort placements within the page (paid placements bubble to top)
  type SuggestedVendor = { placement_tier: string | null; placement_expires_at: string | null; featured: boolean; vendor_account_id?: string; [key: string]: unknown };
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
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Track impressions for vendors with active placements
  const vendorAccountIds = sorted
    .filter((v): v is SuggestedVendor & { vendor_account_id: string } => !!v.vendor_account_id)
    .map((v) => ({
      vendor_account_id: v.vendor_account_id,
      event_type: "impression",
    }));

  if (vendorAccountIds.length > 0) {
    supabase.from("vendor_analytics").insert(vendorAccountIds).then(({ error: err }) => {
      if (err) console.error("[ANALYTICS]", err.message);
    });
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    vendors: sorted,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
