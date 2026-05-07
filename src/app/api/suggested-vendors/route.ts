import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";
import { haversineMiles, radiusBoundingBox } from "@/lib/geocoding";

const PAGE_SIZE = 25;
const DEFAULT_RADIUS_MILES = 50;
const MAX_RADIUS_MILES = 500;

// Explicit column list for selects — never include `quality_score` (admin-only
// ranking signal, see migration 20260426100000_suggested_vendors_quality_score.sql).
// `lat` and `lng` are included so distance ranking works client-side too.
const PUBLIC_COLUMNS = [
  "id", "name", "category", "description",
  "website", "phone", "email", "address",
  "city", "state", "zip", "country",
  "lat", "lng",
  "price_range", "featured", "active",
  "photos",
  "gmb_place_id", "gmb_data", "gmb_last_refreshed_at",
  "created_at", "updated_at",
].join(", ");

type SuggestedRow = {
  id: string;
  lat: number | null;
  lng: number | null;
  featured: boolean | null;
  name: string;
  [k: string]: unknown;
};

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
  const id = url.searchParams.get("id");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || String(PAGE_SIZE), 10)));

  // Geographic relevance: when the caller passes lat/lng we run a bounding-box
  // query and rank by haversine distance. Falls back to city/state ILIKE when
  // coordinates aren't supplied (vendor list pre-geocode, or callers that
  // never had a venue_city).
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  const radiusRaw = url.searchParams.get("radius");
  const userLat = latRaw ? Number(latRaw) : null;
  const userLng = lngRaw ? Number(lngRaw) : null;
  const radiusMiles = Math.min(
    MAX_RADIUS_MILES,
    Math.max(5, Number(radiusRaw) || DEFAULT_RADIUS_MILES)
  );
  const useGeo =
    userLat !== null && userLng !== null &&
    !Number.isNaN(userLat) && !Number.isNaN(userLng);

  const supabase = createSupabaseAdmin();

  // ── Path A: geographic radius ──────────────────────────────────────────
  if (useGeo) {
    const box = radiusBoundingBox(userLat as number, userLng as number, radiusMiles);

    let query = supabase
      .from("suggested_vendors")
      .select(PUBLIC_COLUMNS)
      .eq("active", true)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lat", box.minLat).lte("lat", box.maxLat)
      .gte("lng", box.minLng).lte("lng", box.maxLng);

    if (id) query = query.eq("id", id);
    if (category) query = query.eq("category", category);
    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `search_vector.fts.${term},name.ilike.%${term}%,city.ilike.%${term}%`
      );
    }

    // Cap server result to a generous slice — we'll rank in-memory and slice
    // for pagination. 1,000 vendors covers a 50-mile radius around even the
    // densest US metros.
    query = query.limit(1000);

    const { data, error } = await query;
    const err = supabaseError(error, "suggested-vendors");
    if (err) return err;

    const rows = (data || []) as unknown as SuggestedRow[];

    // Compute precise distance, drop anything outside the radius (bounding box
    // includes corners that exceed the radius), and sort by featured then
    // distance.
    const ranked = rows
      .map((v) => ({
        ...v,
        distance_miles: haversineMiles(
          userLat as number,
          userLng as number,
          v.lat as number,
          v.lng as number
        ),
      }))
      .filter((v) => v.distance_miles <= radiusMiles)
      .sort((a, b) => {
        const f = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        if (f !== 0) return f;
        return a.distance_miles - b.distance_miles;
      });

    const totalCount = ranked.length;
    const totalPages = Math.ceil(totalCount / limit);
    const from = (page - 1) * limit;
    const slice = ranked.slice(from, from + limit);

    return NextResponse.json({
      vendors: slice,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      geo: {
        lat: userLat,
        lng: userLng,
        radiusMiles,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  }

  // ── Path B: legacy city/state filter ─────────────────────────────────
  let query = supabase
    .from("suggested_vendors")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .eq("active", true);

  if (id) query = query.eq("id", id);
  if (category) query = query.eq("category", category);
  if (state) query = query.eq("state", state);
  if (city) query = query.ilike("city", `%${city}%`);

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(
      `search_vector.fts.${term},name.ilike.%${term}%,city.ilike.%${term}%`
    );
  }

  query = query
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  const err = supabaseError(error, "suggested-vendors");
  if (err) return err;

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
