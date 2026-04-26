import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

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
  // Optional single-vendor lookup — used by the admin "Preview as couple"
  // flow to pin one specific vendor into the listing.
  const id = url.searchParams.get("id");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || String(PAGE_SIZE), 10)));

  const supabase = createSupabaseAdmin();

  // Build query with server-side filtering. Explicit column list — never
  // include `quality_score` (admin-only ranking signal, see migration
  // 20260426100000_suggested_vendors_quality_score.sql for rationale).
  const PUBLIC_COLUMNS = [
    "id", "name", "category", "description",
    "website", "phone", "email", "address",
    "city", "state", "zip", "country",
    "price_range", "featured", "active",
    "photos",
    "gmb_place_id", "gmb_data", "gmb_last_refreshed_at",
    "created_at", "updated_at",
  ].join(", ");
  let query = supabase
    .from("suggested_vendors")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .eq("active", true);

  if (id) query = query.eq("id", id);
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

  const err = supabaseError(error, "suggested-vendors");
  if (err) return err;

  // Ranking is purely editorial: featured rows come first (already enforced
  // server-side via the .order() above), then alphabetical. No vendor pays
  // for placement, so there's nothing else to weigh here.

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    vendors: data || [],
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
