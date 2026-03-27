import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

const ALLOWED_FIELDS = [
  "description", "estimated", "amount_paid", "final_cost",
  "category", "paid", "vendor_id",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/expenses/[id]">
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
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "expenses");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "expenses", entityId: id, entityName: (data as Record<string, unknown>).description as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/expenses/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "expenses", id, wedding.id);

  const err = supabaseError(error, "expenses");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "expenses", entityId: id });

  return NextResponse.json({ success: true });
}
