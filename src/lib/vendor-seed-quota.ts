import { createSupabaseAdmin, untypedClient } from "./supabase/server";
import type { PlaceData } from "./google-places";

/**
 * Daily Google Places lookup cap per subscriber. Each lookup costs ~$0.052
 * (text search $0.035 + place details $0.017), so 20/day caps a single
 * user at ~$1.04/day worst case. Cache hits and 'error' results don't
 * count.
 */
export const DAILY_CAP = 20;

/** Cache TTL for repeated identical queries. Vendor data on Google moves
 *  slowly enough that a 24h-old result is fine; the savings are large
 *  (avoids both the search and details calls). */
const CACHE_TTL_HOURS = 24;

/** Build a stable cache key from the user's query. Lowercases and collapses
 *  whitespace so "Bob's  Photography" and "bob's photography" share a slot. */
export function makeCacheKey(name: string, location?: string | null): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const l = (location || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${n}|${l}`;
}

export interface UsageStatus {
  used: number;
  remaining: number;
  cap: number;
}

/** Count today's chargeable lookups for a user. UTC day boundary; rolls
 *  over at midnight UTC regardless of the user's local timezone (simpler
 *  than per-user timezone handling and acceptable for an internal cap). */
export async function getDailyUsage(userId: string): Promise<UsageStatus> {
  const supabase = untypedClient(createSupabaseAdmin());
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("vendor_seed_lookups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("result", ["match", "no_match"])
    .gte("created_at", startOfDay.toISOString());

  const used = count ?? 0;
  return { used, remaining: Math.max(0, DAILY_CAP - used), cap: DAILY_CAP };
}

export interface CachedLookup {
  result: "match" | "no_match";
  placeId: string | null;
  placeData: PlaceData | null;
}

/** Look for a recent identical query. Returns null on miss. Uses the
 *  cache_key index so this is a single-row indexed lookup. */
export async function findCachedLookup(
  cacheKey: string
): Promise<CachedLookup | null> {
  const supabase = untypedClient(createSupabaseAdmin());
  const cutoff = new Date(
    Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("vendor_seed_lookups")
    .select("result, place_id, place_data")
    .eq("cache_key", cacheKey)
    .in("result", ["match", "no_match"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as { result: string; place_id: string | null; place_data: unknown };
  return {
    result: row.result as "match" | "no_match",
    placeId: row.place_id,
    placeData: row.place_data as PlaceData | null,
  };
}

/** Record a lookup. Errors are logged with result='error' (don't count
 *  toward cap) so we can audit reliability without burning user budget. */
export async function logLookup(params: {
  userId: string;
  name: string;
  location: string | null;
  result: "match" | "no_match" | "error";
  placeId: string | null;
  placeData: PlaceData | null;
}): Promise<void> {
  const supabase = untypedClient(createSupabaseAdmin());
  await supabase.from("vendor_seed_lookups").insert({
    user_id: params.userId,
    query_name: params.name,
    query_location: params.location,
    cache_key: makeCacheKey(params.name, params.location),
    result: params.result,
    place_id: params.placeId,
    place_data: params.placeData,
  });
}
