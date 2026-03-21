import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields } from "@/lib/validation";

const ALLOWED_FIELDS = ["caption", "category", "sort_order"];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/mood-board/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;
  const body = await request.json();
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/mood-board/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("mood_board_items")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
