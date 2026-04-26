/**
 * Quality rules for the auto-imported vendor pipeline.
 *
 * Applied by /api/cron/import-vendors after a normalized scraper row has
 * been mapped to Eydn's schema, before insertion into suggested_vendors.
 * Rows that fail any rule are written to vendor_import_rejections instead,
 * where an admin can review + override (which sets manually_approved=true
 * on the inserted suggested_vendors row, telling future re-runs to skip
 * the quality check).
 *
 * Rules are intentionally hardcoded here rather than DB-backed: the
 * thresholds are product decisions tied to Eydn's brand position, change
 * rarely, and benefit from being version-controlled with the code that
 * enforces them. If thresholds start changing weekly, move them to a
 * `quality_rules` config table later.
 */

export const QUALITY_RULES = {
  /**
   * Minimum quality_score (0–100 scale) the scraper must have given the
   * row. Below this we don't surface the vendor to couples — too risky
   * for our brand position.
   */
  minScore: 35,

  /** Vendor must have a street address (city + state alone isn't enough). */
  requireStreetAddress: true,

  /** Vendor must have a phone number couples can call. */
  requirePhone: true,

  /** Vendor must have a website couples can review before reaching out. */
  requireWebsite: true,
} as const;

/** Shape we expect from the normalized vendor going through quality check. */
export type VendorCandidate = {
  name: string | null;
  category: string | null;
  address: string | null;     // street, post-normalization
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  quality_score: number | null;
  /** When true, every rule is treated as passing (admin override). */
  manually_approved?: boolean;
};

export type QualityCheck = {
  passed: boolean;
  failedRules: string[];
};

/**
 * Apply every rule and report which ones the candidate failed.
 * Pure function — no IO, no DB, no env. Tested in quality.test.ts.
 */
export function checkQuality(v: VendorCandidate): QualityCheck {
  if (v.manually_approved) {
    return { passed: true, failedRules: [] };
  }

  const failed: string[] = [];

  // Score: must exist and meet threshold.
  if (v.quality_score === null || v.quality_score === undefined) {
    failed.push(`missing quality_score (min: ${QUALITY_RULES.minScore})`);
  } else if (v.quality_score < QUALITY_RULES.minScore) {
    failed.push(`quality_score below threshold: ${v.quality_score} < ${QUALITY_RULES.minScore}`);
  }

  if (QUALITY_RULES.requireStreetAddress && !nonEmpty(v.address)) {
    failed.push("missing street address");
  }

  if (QUALITY_RULES.requirePhone && !nonEmpty(v.phone)) {
    failed.push("missing phone");
  }

  if (QUALITY_RULES.requireWebsite && !nonEmpty(v.website)) {
    failed.push("missing website");
  }

  return { passed: failed.length === 0, failedRules: failed };
}

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}
