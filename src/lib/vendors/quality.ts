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

  /**
   * Vendor must have at least one way for couples to reach them
   * (phone OR website). Google Places returns sparse data for small
   * wedding vendors — many list only one channel. Requiring all of
   * phone+website+street rejected ~90% of the auto-import pipeline,
   * including most actual wedding boutiques (the survivors were
   * mostly chains like Walmart Bakery and Cheesecake Factory). We
   * still filter unreachable vendors, just less aggressively.
   */
  requireContactMethod: true,

  /**
   * Description must have been finalized — either AI-rewritten or
   * human-written. 'pending' or 'needs_review' descriptions usually mean
   * the source data was thin and Claude couldn't confidently rewrite,
   * so we don't want them in front of couples.
   */
  requireFinishedDescription: true,
} as const;

const ACCEPTABLE_DESCRIPTION_STATUSES = new Set(["ai_generated", "manually_written"]);

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
  /**
   * Status of the vendor's description in the source pipeline.
   * 'pending' / 'needs_review' fail; 'ai_generated' / 'manually_written' pass.
   */
  description_status?: string | null;
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

  if (QUALITY_RULES.requireContactMethod && !nonEmpty(v.phone) && !nonEmpty(v.website)) {
    failed.push("no contact method (need phone or website)");
  }

  if (QUALITY_RULES.requireFinishedDescription) {
    const status = v.description_status ?? null;
    if (!status) {
      failed.push("description_status missing");
    } else if (!ACCEPTABLE_DESCRIPTION_STATUSES.has(status)) {
      failed.push(`description_status not finalized: ${status}`);
    }
  }

  return { passed: failed.length === 0, failedRules: failed };
}

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}
