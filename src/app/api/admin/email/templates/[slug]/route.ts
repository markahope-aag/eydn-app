import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/**
 * GET /api/admin/email/templates/[slug] — fetch a single template (full HTML).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { slug } = await ctx.params;

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ template: data });
}

/**
 * PATCH /api/admin/email/templates/[slug] — update editable fields. Slug,
 * category, and variables are immutable here (changing them would invalidate
 * sequence_steps references; do that via a migration if ever needed).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { slug } = await ctx.params;

  const parsed = await safeParseJSON(req);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.subject === "string") update.subject = body.subject;
  if (typeof body.html === "string") update.html = body.html;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no editable fields supplied" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update(update)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ template: data });
}
