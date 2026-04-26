import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";
import { applyFeaturedRule } from "@/lib/vendors/featured";

const ALLOWED_FIELDS = [
  "name", "category", "description", "website", "phone", "email",
  "address", "city", "state", "zip", "country", "price_range",
  "quality_score",
  "featured", "featured_locked", "active",
];

// Fields that, when changed, invalidate the prior top-N% picks for the
// affected category(ies) and require recomputing the featured rule.
const RANKING_FIELDS = new Set(["quality_score", "category", "active", "featured_locked"]);

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/suggested-vendors/[id]">
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const updates = pickFields(body, ALLOWED_FIELDS);

  // Capture pre-update category so a category change recomputes both buckets.
  const rankingChanged = Object.keys(updates).some((k) => RANKING_FIELDS.has(k));
  let priorCategory: string | null = null;
  if (rankingChanged) {
    const { data: pre } = await supabase
      .from("suggested_vendors")
      .select("category")
      .eq("id", id)
      .maybeSingle();
    priorCategory = (pre?.category as string | null) ?? null;
  }

  const { data, error } = await supabase
    .from("suggested_vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  const err = supabaseError(error, "admin/suggested-vendors");
  if (err) return err;

  if (rankingChanged && data) {
    const newCategory = (data.category as string | null) ?? null;
    const categories = [priorCategory, newCategory].filter((c): c is string => !!c);
    if (categories.length > 0) {
      try {
        await applyFeaturedRule(supabase, { categories });
      } catch {
        // Don't block the admin save on a featured-rule failure — the
        // nightly safety-net cron will reconcile.
      }
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/suggested-vendors/[id]">
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("suggested_vendors")
    .delete()
    .eq("id", id);

  const err = supabaseError(error, "admin/suggested-vendors");
  if (err) return err;

  return NextResponse.json({ success: true });
}
