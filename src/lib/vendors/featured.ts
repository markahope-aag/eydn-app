/**
 * Auto-featured rule: top 10% of active vendors per category (by quality_score)
 * are marked featured. Vendors with featured_locked = true are skipped — admins
 * can pin a row in or out of "featured" and the rule will leave it alone.
 *
 * Picker: top N = max(1, ceil(activeUnlocked * 0.10)) so every category with
 * any active+unlocked rows has at least one featured vendor (avoids dead-zone
 * UX in the couple-facing directory).
 *
 * Tie-break: quality_score desc, then created_at asc, then id. Deterministic
 * across runs so a row doesn't bounce in and out on identical scores.
 *
 * NULL quality_score: sorts last; only featured if there are no scored rows.
 *
 * Called from:
 *   - runScraperImport / runScraperRefresh (on-demand after writes)
 *   - admin PATCH on suggested_vendors when score/category/active change
 *   - /api/cron/recompute-featured nightly safety-net
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AdminSupabase = SupabaseClient<Database>;

export type FeaturedRuleResult = {
  perCategory: Record<string, { active: number; targetFeatured: number; promoted: number; demoted: number }>;
  totalChanged: number;
};

type Row = {
  id: string;
  quality_score: number | null;
  featured: boolean;
  created_at: string | null;
};

/** Sort: quality_score desc nulls last, created_at asc, id asc — deterministic. */
function rank(a: Row, b: Row): number {
  const av = a.quality_score;
  const bv = b.quality_score;
  if (av === null && bv !== null) return 1;
  if (bv === null && av !== null) return -1;
  if (av !== bv && av !== null && bv !== null) return bv - av;
  const at = a.created_at ?? "";
  const bt = b.created_at ?? "";
  if (at !== bt) return at < bt ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/** Pure picker — exposed for tests. Returns ids that should be featured. */
export function pickTopFeatured(rows: Row[]): Set<string> {
  if (rows.length === 0) return new Set();
  const sorted = [...rows].sort(rank);
  const target = Math.max(1, Math.ceil(rows.length * 0.10));
  return new Set(sorted.slice(0, target).map((r) => r.id));
}

/**
 * Apply the rule to one or more categories. If `categories` is omitted, runs
 * across every distinct category present in active+unlocked rows.
 *
 * Only updates rows whose featured value is actually changing — avoids write
 * churn on large categories where most rows are already correct.
 */
export async function applyFeaturedRule(
  supabase: AdminSupabase,
  opts: { categories?: string[] } = {}
): Promise<FeaturedRuleResult> {
  const result: FeaturedRuleResult = { perCategory: {}, totalChanged: 0 };

  let categories = opts.categories;
  if (!categories || categories.length === 0) {
    const { data: distinct } = await supabase
      .from("suggested_vendors")
      .select("category")
      .eq("active", true)
      .eq("featured_locked", false);
    categories = [...new Set((distinct || []).map((r) => r.category as string))];
  }
  // Dedupe in case the caller passed duplicates from per-row import results.
  categories = [...new Set(categories)];

  for (const category of categories) {
    const { data: rows, error } = await supabase
      .from("suggested_vendors")
      .select("id, quality_score, featured, created_at")
      .eq("category", category)
      .eq("active", true)
      .eq("featured_locked", false);

    if (error || !rows) continue;

    const targetIds = pickTopFeatured(rows as Row[]);
    const toPromote: string[] = [];
    const toDemote: string[] = [];
    for (const r of rows as Row[]) {
      const shouldBe = targetIds.has(r.id);
      if (shouldBe && !r.featured) toPromote.push(r.id);
      if (!shouldBe && r.featured) toDemote.push(r.id);
    }

    if (toPromote.length > 0) {
      await supabase.from("suggested_vendors").update({ featured: true }).in("id", toPromote);
    }
    if (toDemote.length > 0) {
      await supabase.from("suggested_vendors").update({ featured: false }).in("id", toDemote);
    }

    result.perCategory[category] = {
      active: rows.length,
      targetFeatured: targetIds.size,
      promoted: toPromote.length,
      demoted: toDemote.length,
    };
    result.totalChanged += toPromote.length + toDemote.length;
  }

  return result;
}
