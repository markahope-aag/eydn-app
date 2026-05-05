/**
 * Auto-import pipeline: pull new vendor rows from the external scraper's
 * Supabase, normalize them, apply Eydn's quality rules, and either insert
 * qualifying rows into suggested_vendors or log them to vendor_import_rejections.
 *
 * Called from /api/cron/import-vendors on an hourly schedule. Idempotent
 * via suggested_vendors.scraper_id + vendor_import_rejections.scraper_id —
 * any scraper row already represented in either table is skipped.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  normalizeCategory,
  normalizeState,
  normalizeCity,
  normalizePhone,
  normalizeWebsite,
  normalizeEmail,
  normalizePriceRange,
} from "@/lib/vendors/normalize";
import { normalizeCategoryWithAI } from "@/lib/vendors/ai-categorize";
import { checkQuality, type VendorCandidate } from "@/lib/vendors/quality";
import { applyFeaturedRule } from "@/lib/vendors/featured";

type AdminSupabase = SupabaseClient<Database>;
type SuggestedVendorInsert = Database["public"]["Tables"]["suggested_vendors"]["Insert"];
type RejectionInsert = Database["public"]["Tables"]["vendor_import_rejections"]["Insert"];

/** Per-photo entry as shipped by the scraper. Stored verbatim into our
 *  suggested_vendors.photos jsonb column so the public CDN URL, attribution,
 *  and dimensions all flow through to the directory render. */
export type ScraperPhoto = {
  url: string;
  source?: string;
  width?: number;
  height?: number;
  attribution?: string;
  fetched_at?: string;
};

/** Shape of a row in the scraper's `vendors` table (subset we care about). */
type ScraperVendor = {
  id: string;
  name: string | null;
  category: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  description: string | null;
  description_status: string | null;
  eydn_score: number | null;
  price_level: string | null;
  market: string | null;
  instagram: string | null;
  facebook: string | null;
  pinterest: string | null;
  business_status: string | null;
  hours: string[] | null;
  lat: number | null;
  lng: number | null;
  /** Ordered photo array shipped by the scraper team (commit 7242c1b on
   *  their side). Each entry: {url, source, width, height, attribution,
   *  fetched_at}. Index 0 is the hero. URLs point at their public Supabase
   *  Storage bucket — no auth, no proxy needed. */
  photos: ScraperPhoto[] | null;
  verified: boolean | null;
  verified_at: string | null;
  verification_method: string | null;
  google_maps_url: string | null;
  _review_count: number | null;
  client_id: string | null;
  created_at: string;
  updated_at: string | null;
};

/** Columns we ask the scraper for. Kept in lock-step with ScraperVendor. */
const SCRAPER_SELECT =
  "id, name, category, street, city, state, zip, country, phone, website, email, " +
  "description, description_status, eydn_score, price_level, market, " +
  "instagram, facebook, pinterest, business_status, hours, lat, lng, photos, _review_count, " +
  "verified, verified_at, verification_method, google_maps_url, " +
  "client_id, created_at, updated_at";

/** Business statuses that mean "don't surface to couples". Vendor stays in
 *  the directory for admin audit but with active=false so it's hidden. */
const CLOSED_BUSINESS_STATUSES = new Set(["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]);

function isOperational(row: ScraperVendor): boolean {
  if (!row.business_status) return true;
  return !CLOSED_BUSINESS_STATUSES.has(row.business_status);
}

/** Build the scraper_extras JSONB blob: scraper-only fields with no first-class column in suggested_vendors. */
function buildScraperExtras(row: ScraperVendor): Record<string, unknown> {
  return {
    market: row.market || undefined,
    instagram: row.instagram || undefined,
    facebook: row.facebook || undefined,
    pinterest: row.pinterest || undefined,
    business_status: row.business_status || undefined,
    hours: row.hours || undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    description_status: row.description_status || undefined,
    review_count: row._review_count ?? undefined,
    verified: row.verified ?? undefined,
    verified_at: row.verified_at || undefined,
    verification_method: row.verification_method || undefined,
    google_maps_url: row.google_maps_url || undefined,
  };
}

/** Cap per cron run — keeps any single run bounded and predictable. */
const MAX_BATCH = 500;
/** PostgREST hard-caps responses at 1000 rows; paginate via .range() to scan
 *  past that. Each page is one HTTP round-trip to the scraper Supabase. With
 *  MAX_BATCH=500 the loop runs once and behaves like a single .limit() call. */
const SCRAPER_PAGE_SIZE = 1000;

export type ScraperImportResult = {
  scannedFromScraper: number;
  alreadySeen: number;
  inserted: number;
  rejected: number;
  errors: string[];
  insertedNames: string[];     // first 10, for log readability
  rejectionSummary: Record<string, number>; // failed-rule → count
};

/**
 * Pull new vendor rows from the scraper's Supabase and process them.
 *
 * @param supabase Eydn's local admin client
 * @param scraperUrl  The scraper project URL (https://*.supabase.co)
 * @param scraperKey  The scraper project's service role key (read access)
 * @param clientId    The scraper's `client_id` value to filter on (multi-tenant)
 */
export async function runScraperImport(
  supabase: AdminSupabase,
  scraperUrl: string,
  scraperKey: string,
  clientId: string
): Promise<ScraperImportResult> {
  const result: ScraperImportResult = {
    scannedFromScraper: 0,
    alreadySeen: 0,
    inserted: 0,
    rejected: 0,
    errors: [],
    insertedNames: [],
    rejectionSummary: {},
  };

  // 1. Connect to the scraper's Supabase (read-only client, separate from
  //    Eydn's local admin client).
  const scraperSupabase = createClient(scraperUrl, scraperKey, {
    auth: { persistSession: false },
  });

  // 2. Find what we've already processed (positive or negative outcome) so
  //    we don't re-fetch + re-process. Both tables grow without bound — the
  //    PostgREST default 1000-row cap is way too small (suggested_vendors
  //    crossed it in May 2026, causing duplicate-key insert errors when the
  //    seen check missed rows 1001+). Paginate explicitly via .range().
  const seen = new Set<string>();
  const SEEN_PAGE = 1000;

  async function loadSeen(
    table: "suggested_vendors" | "vendor_import_rejections"
  ): Promise<void> {
    let offset = 0;
    for (;;) {
      let q = supabase
        .from(table)
        .select("scraper_id")
        .order("scraper_id", { ascending: true })
        .range(offset, offset + SEEN_PAGE - 1);
      // Only suggested_vendors has the IS NOT NULL guard — rejections always
      // carry a scraper_id by construction.
      if (table === "suggested_vendors") q = q.not("scraper_id", "is", null);
      const { data, error } = await q;
      if (error || !data) break;
      for (const r of data) {
        const sid = (r as { scraper_id: string | null }).scraper_id;
        if (sid) seen.add(sid);
      }
      if (data.length < SEEN_PAGE) break;
      offset += SEEN_PAGE;
    }
  }

  await loadSeen("suggested_vendors");
  await loadSeen("vendor_import_rejections");

  // 3. Pull up to MAX_BATCH rows from the scraper, paginating around the
  //    PostgREST 1000-row response cap. We sort by created_at desc so the
  //    newest vendors are seen first; older rows catch up on subsequent
  //    cron runs.
  const scraperRows: ScraperVendor[] = [];
  for (let from = 0; from < MAX_BATCH; from += SCRAPER_PAGE_SIZE) {
    const to = Math.min(from + SCRAPER_PAGE_SIZE - 1, MAX_BATCH - 1);
    const { data, error } = await scraperSupabase
      .from("vendors")
      .select(SCRAPER_SELECT)
      .eq("client_id", clientId)
      // Active-only — the scraper archives anything that fails its post-scrape
      // gates (score, etc.). Without this filter, archived vendors slip
      // through Eydn's import since the local quality rules (quality.ts) are
      // disabled in favor of trusting the scraper.
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      result.errors.push(`scraper query failed: ${error.message}`);
      return result;
    }

    const batch = (data || []) as unknown as ScraperVendor[];
    scraperRows.push(...batch);
    if (batch.length < SCRAPER_PAGE_SIZE) break;
  }

  result.scannedFromScraper = scraperRows.length;

  // 4. Process each row. Skip already-seen, normalize, quality-check,
  //    insert into the appropriate destination table.
  const toInsert: SuggestedVendorInsert[] = [];
  const toReject: RejectionInsert[] = [];

  for (const row of scraperRows) {
    if (seen.has(row.id)) {
      result.alreadySeen++;
      continue;
    }

    // Normalize. Mirrors the shape the manual Supabase importer produces.
    const rawCategory = row.category || "";
    const rawState = row.state || "";

    // Three-tier category resolution: static aliases → DB cache → Claude Haiku.
    // Each unknown raw string costs at most one AI call across the lifetime
    // of the system; cached forever after.
    const categoryResolved = rawCategory
      ? await normalizeCategoryWithAI(rawCategory, supabase)
      : null;
    const resolvedCategory = categoryResolved?.category ?? null;

    const candidate: VendorCandidate & { country?: string; description?: string | null; price_range?: string | null } = {
      name: row.name?.trim() || null,
      category: resolvedCategory,
      address: row.street?.trim() || null,
      city: row.city ? normalizeCity(row.city) : null,
      state: rawState ? (normalizeState(rawState) || rawState.toUpperCase().slice(0, 2)) : null,
      phone: row.phone ? normalizePhone(row.phone) : null,
      website: row.website ? normalizeWebsite(row.website) : null,
      quality_score: row.eydn_score,
      description_status: row.description_status,
      country: row.country?.trim() || "US",
      description: row.description?.trim() || null,
      price_range: row.price_level !== null ? normalizePriceRange(String(row.price_level)) : null,
    };

    // Hard-fail: structural fields the schema requires. These are never
    // overridable — without name/category/city/state we can't even insert.
    if (!candidate.name || !candidate.category || !candidate.city || !candidate.state || candidate.state.length !== 2) {
      const reasons: string[] = [];
      if (!candidate.name) reasons.push("missing name");
      if (!candidate.category) {
        // Distinguish "no category at all" from "category not recognized" so
        // the rejection panel tells the admin why this needs attention.
        if (!rawCategory) {
          reasons.push("missing category");
        } else if (categoryResolved?.source === "ai") {
          reasons.push(`category '${rawCategory}' rejected by AI: ${categoryResolved.reasoning ?? "low confidence"}`);
        } else if (categoryResolved?.source === "cache") {
          reasons.push(`category '${rawCategory}' previously rejected by AI: ${categoryResolved.reasoning ?? "no canonical match"}`);
        } else {
          reasons.push(`category '${rawCategory}' not recognized`);
        }
      }
      if (!candidate.city) reasons.push("missing city");
      if (!candidate.state || candidate.state.length !== 2) reasons.push(`invalid state '${rawState}'`);
      toReject.push({
        scraper_id: row.id,
        scraper_data: row as unknown as Database["public"]["Tables"]["vendor_import_rejections"]["Insert"]["scraper_data"],
        failed_rules: reasons,
      });
      result.rejected++;
      for (const r of reasons) tally(result.rejectionSummary, r);
      continue;
    }

    // Quality rules.
    const qc = checkQuality(candidate);
    if (!qc.passed) {
      toReject.push({
        scraper_id: row.id,
        scraper_data: row as unknown as Database["public"]["Tables"]["vendor_import_rejections"]["Insert"]["scraper_data"],
        failed_rules: qc.failedRules,
      });
      result.rejected++;
      for (const rule of qc.failedRules) tally(result.rejectionSummary, rule);
      continue;
    }

    toInsert.push({
      scraper_id: row.id,
      name: candidate.name,
      category: candidate.category,
      address: candidate.address,
      city: candidate.city,
      state: candidate.state,
      zip: row.zip?.trim() || null,
      country: candidate.country,
      phone: candidate.phone,
      website: candidate.website,
      email: row.email ? normalizeEmail(row.email) : null,
      description: candidate.description,
      price_range: candidate.price_range,
      quality_score: candidate.quality_score,
      photos: (row.photos ?? []) as unknown as Database["public"]["Tables"]["suggested_vendors"]["Insert"]["photos"],
      scraper_extras: buildScraperExtras(row) as Database["public"]["Tables"]["suggested_vendors"]["Insert"]["scraper_extras"],
      gmb_last_refreshed_at: new Date().toISOString(),
      featured: false,
      // Closed vendors land inactive — kept for admin audit but never shown.
      active: isOperational(row),
      seed_source: "scraper_auto",
      import_source: "scraper_auto",
    });
  }

  // 5. Persist rejections first so they are recorded as "seen" even if the
  //    happy-path insert fails. Try the bulk path; if a single bad row poisons
  //    it, fall back to one-by-one so the rest still land.
  if (toReject.length > 0) {
    const { error: rejectError } = await supabase
      .from("vendor_import_rejections")
      .insert(toReject);
    if (rejectError) {
      result.errors.push(
        `rejection log batch failed (${rejectError.message}); falling back to per-row`
      );
      for (const r of toReject) {
        const { error: oneErr } = await supabase
          .from("vendor_import_rejections")
          .insert(r);
        if (oneErr) {
          result.errors.push(
            `rejection log failed for scraper_id=${r.scraper_id}: ${oneErr.message}`
          );
        }
      }
    }
  }

  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("suggested_vendors").insert(batch);
      if (!insertError) {
        result.inserted += batch.length;
        for (const row of batch) {
          if (result.insertedNames.length < 10 && typeof row.name === "string") {
            result.insertedNames.push(row.name);
          }
        }
        continue;
      }

      // Bulk failed — one bad row aborted the whole batch. Retry one-by-one
      // so the rest still land, and route the offender to vendor_import_rejections
      // with the DB error as the failed_rule. Without this, the bad row keeps
      // poisoning every future cron run because dedup never marks it as seen.
      result.errors.push(
        `insert batch ${Math.floor(i / batchSize) + 1} failed in bulk (${insertError.message}); retrying row-by-row`
      );
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("suggested_vendors")
          .insert(row);
        if (!oneErr) {
          result.inserted++;
          if (result.insertedNames.length < 10 && typeof row.name === "string") {
            result.insertedNames.push(row.name);
          }
          continue;
        }
        const ruleLabel = `db insert failed: ${oneErr.message}`;
        const scraperId = typeof row.scraper_id === "string" ? row.scraper_id : null;
        if (scraperId) {
          await supabase.from("vendor_import_rejections").insert({
            scraper_id: scraperId,
            scraper_data: row as unknown as Database["public"]["Tables"]["vendor_import_rejections"]["Insert"]["scraper_data"],
            failed_rules: [ruleLabel],
          });
        } else {
          result.errors.push(`row insert failed (no scraper_id) name=${row.name}: ${oneErr.message}`);
        }
        result.rejected++;
        tally(result.rejectionSummary, ruleLabel);
      }
    }
  }

  // 6. Recompute featured for any category that received new rows. The
  //    rule is an idempotent "top N% per category" computation — running
  //    it after inserts keeps newly-arrived high-score vendors visible
  //    immediately instead of waiting for the nightly safety-net cron.
  if (result.inserted > 0) {
    const touchedCategories = [
      ...new Set(toInsert.map((r) => r.category).filter((c): c is string => typeof c === "string")),
    ];
    if (touchedCategories.length > 0) {
      try {
        await applyFeaturedRule(supabase, { categories: touchedCategories });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`featured rule failed: ${message}`);
      }
    }
  }

  return result;
}

function tally(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

// ─── Refresh path ────────────────────────────────────────────────────────────
// Periodically (weekly cron) re-pull stale vendors from the scraper to
// pick up score/contact changes. Quality rules are NOT re-applied —
// originally-imported rows stay imported even if their data has degraded.
// Admin can sort by score in the directory and prune manually.

const REFRESH_AGE_DAYS = 90;
const MAX_REFRESH_BATCH = 100;

export type ScraperRefreshResult = {
  candidatesScanned: number;
  refreshed: number;
  notFoundInScraper: number;
  errors: string[];
  refreshedNames: string[]; // first 10
};

/**
 * Re-pull vendors that were imported from the scraper and haven't been
 * refreshed in REFRESH_AGE_DAYS. Updates mutable fields in place.
 */
export async function runScraperRefresh(
  supabase: AdminSupabase,
  scraperUrl: string,
  scraperKey: string,
  clientId: string
): Promise<ScraperRefreshResult> {
  const result: ScraperRefreshResult = {
    candidatesScanned: 0,
    refreshed: 0,
    notFoundInScraper: 0,
    errors: [],
    refreshedNames: [],
  };

  const cutoff = new Date(Date.now() - REFRESH_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find scraper-sourced vendors that are stale OR have never been refreshed.
  const { data: stale, error: staleError } = await supabase
    .from("suggested_vendors")
    .select("id, scraper_id, gmb_last_refreshed_at")
    .eq("seed_source", "scraper_auto")
    .not("scraper_id", "is", null)
    .or(`gmb_last_refreshed_at.is.null,gmb_last_refreshed_at.lt.${cutoff}`)
    .order("gmb_last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(MAX_REFRESH_BATCH);

  if (staleError) {
    result.errors.push(`stale lookup failed: ${staleError.message}`);
    return result;
  }

  result.candidatesScanned = (stale || []).length;
  if (result.candidatesScanned === 0) return result;

  const scraperIds = (stale || []).map((r) => r.scraper_id as string).filter(Boolean);
  const idToEydnRow = new Map<string, string>();
  for (const r of stale || []) {
    if (r.scraper_id) idToEydnRow.set(r.scraper_id, r.id as string);
  }

  // Pull current data for those ids from the scraper.
  const scraperSupabase = createClient(scraperUrl, scraperKey, {
    auth: { persistSession: false },
  });

  const { data: current, error: currentError } = await scraperSupabase
    .from("vendors")
    .select(SCRAPER_SELECT)
    .in("id", scraperIds)
    .eq("client_id", clientId);

  if (currentError) {
    result.errors.push(`scraper refresh fetch failed: ${currentError.message}`);
    return result;
  }

  const currentRows = (current || []) as unknown as ScraperVendor[];
  const foundIds = new Set(currentRows.map((r) => r.id));
  result.notFoundInScraper = scraperIds.filter((id) => !foundIds.has(id)).length;

  const now = new Date().toISOString();
  const touchedCategories = new Set<string>();
  for (const row of currentRows) {
    const eydnId = idToEydnRow.get(row.id);
    if (!eydnId) continue;

    const updates = {
      name: row.name?.trim() || undefined,
      address: row.street?.trim() || null,
      city: row.city ? normalizeCity(row.city) : undefined,
      state: row.state ? (normalizeState(row.state) || row.state.toUpperCase().slice(0, 2)) : undefined,
      zip: row.zip?.trim() || null,
      phone: row.phone ? normalizePhone(row.phone) : null,
      website: row.website ? normalizeWebsite(row.website) : null,
      email: row.email ? normalizeEmail(row.email) : null,
      description: row.description?.trim() || null,
      price_range: row.price_level !== null ? normalizePriceRange(String(row.price_level)) : null,
      quality_score: row.eydn_score,
      photos: (row.photos ?? []) as unknown as Database["public"]["Tables"]["suggested_vendors"]["Insert"]["photos"],
      scraper_extras: buildScraperExtras(row) as Database["public"]["Tables"]["suggested_vendors"]["Insert"]["scraper_extras"],
      gmb_last_refreshed_at: now,
      // If the vendor closed since last refresh, hide it without deleting.
      active: isOperational(row),
    };

    const { error: updateError } = await supabase
      .from("suggested_vendors")
      .update(updates)
      .eq("id", eydnId);

    if (updateError) {
      result.errors.push(`update failed for ${row.name}: ${updateError.message}`);
      continue;
    }

    result.refreshed++;
    if (result.refreshedNames.length < 10 && row.name) {
      result.refreshedNames.push(row.name);
    }
    if (row.category) {
      const normalized = normalizeCategory(row.category) || row.category;
      touchedCategories.add(normalized);
    }
  }

  // For vendors we couldn't find in the scraper (deleted upstream), bump
  // their refresh timestamp so they don't keep re-appearing in the queue.
  // The data stays in the directory until admin removes it.
  const missing = scraperIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    await supabase
      .from("suggested_vendors")
      .update({ gmb_last_refreshed_at: now })
      .in("scraper_id", missing);
  }

  // Refresh can flip a vendor's active state (closed business) and shift
  // quality_score — both invalidate the prior top-N% picks. Recompute for
  // any category we touched.
  if (touchedCategories.size > 0) {
    try {
      await applyFeaturedRule(supabase, { categories: [...touchedCategories] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`featured rule failed: ${message}`);
    }
  }

  return result;
}
