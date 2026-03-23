import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";

const ALLOWED_FIELDS = ["table_number", "name", "x", "y", "shape", "capacity"];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/seating/tables/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("seating_tables")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "seating_tables", entityId: id, entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/seating/tables/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "seating_tables", id, wedding.id);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "seating_tables", entityId: id });

  return NextResponse.json({ success: true });
}
