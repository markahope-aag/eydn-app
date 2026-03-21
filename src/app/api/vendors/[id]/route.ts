import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";

const ALLOWED_FIELDS = [
  "name", "category", "status", "poc_name", "poc_email", "poc_phone",
  "notes", "amount", "amount_paid",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/vendors/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;
  const body = await request.json();
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "vendors", entityId: id, entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/vendors/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "vendors", id, wedding.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "vendors", entityId: id });

  return NextResponse.json({ success: true });
}
