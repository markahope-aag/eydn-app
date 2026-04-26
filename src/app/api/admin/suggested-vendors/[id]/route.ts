import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

const ALLOWED_FIELDS = [
  "name", "category", "description", "website", "phone", "email",
  "address", "city", "state", "zip", "country", "price_range",
  "quality_score",
  "featured", "active",
];

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

  const { data, error } = await supabase
    .from("suggested_vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  const err = supabaseError(error, "admin/suggested-vendors");
  if (err) return err;

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
