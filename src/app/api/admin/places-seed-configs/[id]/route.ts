import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/** PATCH /api/admin/places-seed-configs/[id] — update enabled / max_results. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { id } = await ctx.params;

  const parsed = await safeParseJSON(req);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.max_results === "number") {
    update.max_results = Math.max(1, Math.min(60, body.max_results));
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no editable fields supplied" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("places_seed_configs")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ config: data });
}

/** DELETE /api/admin/places-seed-configs/[id]. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { id } = await ctx.params;

  const { error } = await supabase.from("places_seed_configs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
