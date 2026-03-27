import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

const ALLOWED_FIELDS = ["caption", "category", "location", "sort_order", "vendor_id"];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/mood-board/[id]">
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
    .from("mood_board_items")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "mood-board");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "mood_board_items", entityId: id, entityName: (data as Record<string, unknown>).caption as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/mood-board/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "mood_board_items", id, wedding.id);

  const err = supabaseError(error, "mood-board");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "mood_board_items", entityId: id });

  return NextResponse.json({ success: true });
}
