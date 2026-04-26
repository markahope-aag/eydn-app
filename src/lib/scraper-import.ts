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
import { checkQuality, type VendorCandidate } from "@/lib/vendors/quality";

type AdminSupabase = SupabaseClient<Database>;
type SuggestedVendorInsert = Database["public"]["Tables"]["suggested_vendors"]["Insert"];
type RejectionInsert = Database["public"]["Tables"]["vendor_import_rejections"]["Insert"];

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
  eydn_score: number | null;
  price_level: number | null;
  client_id: string | null;
  created_at: string;
};

/** Cap per cron run — keeps any single run bounded and predictable. */
const MAX_BATCH = 500;

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
  //    we don't re-fetch + re-process.
  const { data: existingInDirectory } = await supabase
    .from("suggested_vendors")
    .select("scraper_id")
    .not("scraper_id", "is", null);
  const { data: existingRejected } = await supabase
    .from("vendor_import_rejections")
    .select("scraper_id");

  const seen = new Set<string>([
    ...(existingInDirectory || []).map((r) => r.scraper_id as string).filter(Boolean),
    ...(existingRejected || []).map((r) => r.scraper_id as string).filter(Boolean),
  ]);

  // 3. Pull a batch from the scraper. We sort by created_at desc so that
  //    if there are more rows than MAX_BATCH, we always process the newest
  //    first; older rows catch up on subsequent cron runs.
  const { data: scraperRows, error: scraperError } = await scraperSupabase
    .from("vendors")
    .select(
      "id, name, category, street, city, state, zip, country, phone, website, email, description, eydn_score, price_level, client_id, created_at"
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(MAX_BATCH);

  if (scraperError) {
    result.errors.push(`scraper query failed: ${scraperError.message}`);
    return result;
  }

  result.scannedFromScraper = (scraperRows || []).length;

  // 4. Process each row. Skip already-seen, normalize, quality-check,
  //    insert into the appropriate destination table.
  const toInsert: SuggestedVendorInsert[] = [];
  const toReject: RejectionInsert[] = [];

  for (const row of (scraperRows || []) as ScraperVendor[]) {
    if (seen.has(row.id)) {
      result.alreadySeen++;
      continue;
    }

    // Normalize. Mirrors the shape the manual Supabase importer produces.
    const rawCategory = row.category || "";
    const rawState = row.state || "";
    const candidate: VendorCandidate & { country?: string; description?: string | null; price_range?: string | null } = {
      name: row.name?.trim() || null,
      category: rawCategory ? (normalizeCategory(rawCategory) || rawCategory) : null,
      address: row.street?.trim() || null,
      city: row.city ? normalizeCity(row.city) : null,
      state: rawState ? (normalizeState(rawState) || rawState.toUpperCase().slice(0, 2)) : null,
      phone: row.phone ? normalizePhone(row.phone) : null,
      website: row.website ? normalizeWebsite(row.website) : null,
      quality_score: row.eydn_score,
      country: row.country?.trim() || "US",
      description: row.description?.trim() || null,
      price_range: row.price_level !== null ? normalizePriceRange(String(row.price_level)) : null,
    };

    // Hard-fail: structural fields the schema requires. These are never
    // overridable — without name/category/city/state we can't even insert.
    if (!candidate.name || !candidate.category || !candidate.city || !candidate.state || candidate.state.length !== 2) {
      toReject.push({
        scraper_id: row.id,
        scraper_data: row as unknown as Database["public"]["Tables"]["vendor_import_rejections"]["Insert"]["scraper_data"],
        failed_rules: ["missing required structural field (name/category/city/state)"],
      });
      result.rejected++;
      tally(result.rejectionSummary, "missing required structural field (name/category/city/state)");
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
      featured: false,
      active: true,
      seed_source: "scraper_auto",
    });
  }

  // 5. Bulk insert. Both writes are best-effort; partial success is fine.
  if (toReject.length > 0) {
    const { error: rejectError } = await supabase
      .from("vendor_import_rejections")
      .insert(toReject);
    if (rejectError) {
      result.errors.push(`rejection log write failed: ${rejectError.message}`);
    }
  }

  if (toInsert.length > 0) {
    // Insert in batches of 100 so a single bad row doesn't block the whole
    // batch (insert returns one error for the whole call by default).
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("suggested_vendors").insert(batch);
      if (insertError) {
        result.errors.push(`insert batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`);
      } else {
        result.inserted += batch.length;
        for (const row of batch) {
          if (result.insertedNames.length < 10 && typeof row.name === "string") {
            result.insertedNames.push(row.name);
          }
        }
      }
    }
  }

  return result;
}

function tally(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}
