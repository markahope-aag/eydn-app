import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
