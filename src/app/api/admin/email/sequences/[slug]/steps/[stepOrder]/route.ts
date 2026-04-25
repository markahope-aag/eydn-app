import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/**
 * PATCH /api/admin/email/sequences/[slug]/steps/[stepOrder]
 * Editable fields: offset_days, audience_filter (jsonb), enabled, template_slug.
 * Use to retime a step or swap which template it uses.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string; stepOrder: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { slug, stepOrder } = await ctx.params;
  const stepOrderNum = Number.parseInt(stepOrder, 10);
  if (!Number.isFinite(stepOrderNum)) {
    return NextResponse.json({ error: "stepOrder must be an integer" }, { status: 400 });
  }

  const parsed = await safeParseJSON(req);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.offset_days === "number" && Number.isFinite(body.offset_days)) {
    update.offset_days = Math.trunc(body.offset_days);
  }
  if (body.audience_filter && typeof body.audience_filter === "object") {
    update.audience_filter = body.audience_filter;
  }
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.template_slug === "string") update.template_slug = body.template_slug;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no editable fields supplied" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("email_sequence_steps")
    .update(update)
    .eq("sequence_slug", slug)
    .eq("step_order", stepOrderNum)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ step: data });
}
