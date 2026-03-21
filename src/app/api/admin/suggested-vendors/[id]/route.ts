import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { pickFields } from "@/lib/validation";

const ALLOWED_FIELDS = [
  "name", "category", "description", "website", "phone", "email",
  "address", "city", "state", "zip", "country", "price_range",
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
  const body = await request.json();
  const updates = pickFields(body, ALLOWED_FIELDS);

  const { data, error } = await supabase
    .from("suggested_vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
