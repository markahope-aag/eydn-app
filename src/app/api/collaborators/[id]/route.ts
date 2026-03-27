import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/collaborators/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, role } = result;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only the wedding owner can remove collaborators" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("wedding_collaborators")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "collaborators");
  if (err) return err;

  return NextResponse.json({ success: true });
}
