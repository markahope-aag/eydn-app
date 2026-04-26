/**
 * Google Places API seeder for the suggested_vendors directory.
 *
 * The seeder pulls businesses from Google's textSearch endpoint
 * (cost: ~$0.040 per call as of April 2026, returns up to 20 places per page)
 * and upserts them into suggested_vendors keyed on the canonical Google
 * place_id. A daily cost-cap (PLACES_API_DAILY_CAP env var, default 200
 * cost units) bounds spend; the cap is enforced via places_api_usage_log.
 *
 * Cost units are approximations of Google's pricing tiers:
 *   textSearch (with our field mask) ≈ 8 units per call
 *   placeDetails (Essentials)         ≈ 4 units per call (used by the on-
 *                                       demand enrichment route, not here)
 *
 * The seeder writes only basic fields. Reviews, photos, and full details
 * are fetched on-demand when a couple opens a vendor card via the existing
 * /api/suggested-vendors/[id]/gmb route — keeps per-row seeding cheap.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const PLACES_BASE = "https://places.googleapis.com/v1";

// Cost unit per call. Adjust if you switch field masks (richer fields move
// you to a more expensive Places tier).
const COST_TEXT_SEARCH = 8;

// Field mask for textSearch results — basic info only, keeps the call in
// the cheaper "Essentials" tier territory.
const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.priceLevel",
  "nextPageToken",
].join(",");

type AdminSupabase = SupabaseClient<Database>;

export type PlacesTextSearchResult = {
  id: string;
  name: string;
  formattedAddress: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  nationalPhoneNumber: string | null;
  priceLevel: string | null;
};

/**
 * Map Google's PRICE_LEVEL_INEXPENSIVE / MODERATE / EXPENSIVE / VERY_EXPENSIVE
 * onto Eydn's $/$$/$$$/$$$$ display vocabulary. Returns null for unknown
 * or missing values so the directory falls back to "no price set" rather
 * than fabricating a tier.
 */
export function mapPriceLevel(googleLevel: string | null | undefined): "$" | "$$" | "$$$" | "$$$$" | null {
  switch (googleLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return null;
  }
}

/** Daily cost cap from env, defaults to 200 cost units (~25 textSearch calls). */
export function getDailyCap(): number {
  const raw = process.env.PLACES_API_DAILY_CAP;
  if (!raw) return 200;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 200;
}

/** Sum of cost units used today (UTC midnight to now). */
export async function getTodaysUsage(supabase: AdminSupabase): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("places_api_usage_log")
    .select("cost_units")
    .gte("called_at", startOfDay.toISOString());
  return (data || []).reduce((sum, row) => sum + (row.cost_units ?? 0), 0);
}

/** Single textSearch call. Caller is responsible for cap enforcement + logging. */
export async function placesTextSearch(
  query: string,
  pageToken?: string | null,
  apiKey?: string
): Promise<{ results: PlacesTextSearchResult[]; nextPageToken: string | null }> {
  const key = apiKey ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY not configured");

  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Places textSearch HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  type RawPlace = {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    priceLevel?: string;
  };
  const results: PlacesTextSearchResult[] = (data.places || []).map((p: RawPlace) => ({
    id: p.id,
    name: p.displayName?.text || "",
    formattedAddress: p.formattedAddress || null,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    websiteUri: p.websiteUri || null,
    nationalPhoneNumber: p.nationalPhoneNumber || null,
    priceLevel: p.priceLevel || null,
  }));
  return { results, nextPageToken: data.nextPageToken || null };
}

export type SeedConfigRow = {
  id: string;
  category: string;
  city: string;
  state: string;
  country: string;
  max_results: number;
  enabled: boolean;
};

export type SeedRunResult = {
  configId: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  costUnitsSpent: number;
  capHit: boolean;
  error?: string;
};

/**
 * Run the seeder for one config. Calls Places textSearch (paginated up to
 * the config's max_results), upserts results into suggested_vendors keyed
 * on gmb_place_id, and logs each call to places_api_usage_log so the daily
 * cap can be enforced across runs. Returns a summary.
 */
export async function runSeedConfig(
  supabase: AdminSupabase,
  config: SeedConfigRow,
  now: Date = new Date()
): Promise<SeedRunResult> {
  const result: SeedRunResult = {
    configId: config.id,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    costUnitsSpent: 0,
    capHit: false,
  };

  const cap = getDailyCap();
  const usedToday = await getTodaysUsage(supabase);
  if (usedToday >= cap) {
    result.capHit = true;
    return result;
  }

  const query = `${config.category} in ${config.city}, ${config.state}`;
  let pageToken: string | null = null;
  let resultsCollected = 0;

  try {
    while (resultsCollected < config.max_results) {
      // Bail if the next call would push past the cap.
      if (usedToday + result.costUnitsSpent + COST_TEXT_SEARCH > cap) {
        result.capHit = true;
        break;
      }

      const { results, nextPageToken } = await placesTextSearch(query, pageToken);
      result.costUnitsSpent += COST_TEXT_SEARCH;
      await supabase
        .from("places_api_usage_log")
        .insert({ endpoint: "places.searchText", cost_units: COST_TEXT_SEARCH, called_at: now.toISOString() });

      for (const place of results) {
        if (resultsCollected >= config.max_results) break;
        resultsCollected++;
        result.fetched++;

        if (!place.name || !place.id) {
          result.skipped++;
          continue;
        }

        const upsertRow = {
          gmb_place_id: place.id,
          name: place.name,
          category: config.category,
          city: config.city,
          state: config.state,
          country: config.country,
          address: place.formattedAddress,
          website: place.websiteUri,
          phone: place.nationalPhoneNumber,
          price_range: mapPriceLevel(place.priceLevel),
          active: true,
          featured: false,
          seed_source: "places_api",
          gmb_last_refreshed_at: now.toISOString(),
          updated_at: now.toISOString(),
        } as const;

        // First check if a row with this place_id exists. If yes, update;
        // otherwise insert. (onConflict upsert would also work, but we want
        // the inserted vs updated counts for the run summary.)
        const { data: existing } = await supabase
          .from("suggested_vendors")
          .select("id")
          .eq("gmb_place_id", place.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("suggested_vendors")
            .update({
              name: upsertRow.name,
              address: upsertRow.address,
              website: upsertRow.website,
              phone: upsertRow.phone,
              price_range: upsertRow.price_range,
              gmb_last_refreshed_at: upsertRow.gmb_last_refreshed_at,
            })
            .eq("id", existing.id);
          result.updated++;
        } else {
          await supabase.from("suggested_vendors").insert(upsertRow);
          result.inserted++;
        }
      }

      if (!nextPageToken || resultsCollected >= config.max_results) break;
      pageToken = nextPageToken;
      // Google requires a short delay between paged requests.
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  // Update the config's run metadata regardless of error so we don't
  // hot-loop on a permanently-failing config.
  await supabase
    .from("places_seed_configs")
    .update({
      last_run_at: now.toISOString(),
      next_run_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_result_count: result.fetched,
      last_error: result.error ?? null,
    })
    .eq("id", config.id);

  return result;
}
