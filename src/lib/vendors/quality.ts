/**
 * Quality rules for the auto-imported vendor pipeline.
 *
 * As of 2026-05-05 the scraper is the source of truth for quality. Its
 * post-scrape phase chain (enrichment → rewrite_drain → archive_low_score
 * → socials → photos → webhook) archives vendors that fail its gates,
 * and runScraperImport now filters to `archived_at IS NULL` — so anything
 * Eydn pulls has already cleared the scraper's bar.
 *
 * The rules below are kept (rather than deleted) so an admin can re-enable
 * a defense-in-depth check here if the scraper's gates ever get loosened.
 * `manually_approved` overrides still bypass these checks; structural
 * hard-fails (missing name/category/city/state) remain in scraper-import
 * because the schema can't store them as null.
 */

export const QUALITY_RULES = {
  /**
   * 0 = disabled. Set to a number > 0 to re-impose a score floor on
   * Eydn's side (the scraper already enforces score >= 35 via the
   * archive_low_score post-phase).
   */
  minScore: 0,

  /**
   * false = disabled. The scraper's archive_low_score phase doesn't
   * archive on missing contact today — flip this to true to require
   * phone-or-website until the scraper grows that gate.
   */
  requireContactMethod: false,

  /**
   * false = disabled. Vendors with description_status='pending' will
   * be imported. The scraper's rewrite_drain phase aims to leave none
   * pending; flip true to defend against the cap getting hit.
   */
  requireFinishedDescription: false,
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

  // Score: must exist and meet threshold. Skip entirely when minScore is 0 —
  // disabled means we don't care about the score column at all (otherwise a
  // null score would still fail despite the rule being "off").
  if (QUALITY_RULES.minScore > 0) {
    if (v.quality_score === null || v.quality_score === undefined) {
      failed.push(`missing quality_score (min: ${QUALITY_RULES.minScore})`);
    } else if (v.quality_score < QUALITY_RULES.minScore) {
      failed.push(`quality_score below threshold: ${v.quality_score} < ${QUALITY_RULES.minScore}`);
    }
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
