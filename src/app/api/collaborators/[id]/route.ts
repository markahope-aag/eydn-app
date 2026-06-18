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

  // Look up the target row first so we can purge EVERY row tied to this
  // collaborator on this wedding — not just the one clicked. Access is granted
  // by ANY matching row: an accepted row (by user_id) OR a pending invite (by
  // email, which resolveWeddingForUserId auto-accepts on next sign-in).
  // Duplicate/leftover invite rows for the same email exist in the data, so
  // deleting a single row by id left another row that silently re-granted
  // access on the next page load.
  const { data: target } = await supabase
    .from("wedding_collaborators")
    .select("email, user_id")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .maybeSingle();

  const collaborator = target as { email: string | null; user_id: string | null } | null;

  // Always remove the clicked row.
  const { error } = await supabase
    .from("wedding_collaborators")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "collaborators");
  if (err) return err;

  // Purge any other rows for the same collaborator on this wedding (duplicate
  // invites or a lingering pending row) so access is fully revoked and can't be
  // re-granted via the email auto-accept path.
  if (collaborator?.email) {
    await supabase
      .from("wedding_collaborators")
      .delete()
      .eq("wedding_id", wedding.id)
      .eq("email", collaborator.email);
  }
  if (collaborator?.user_id) {
    await supabase
      .from("wedding_collaborators")
      .delete()
      .eq("wedding_id", wedding.id)
      .eq("user_id", collaborator.user_id);
  }

  return NextResponse.json({ success: true });
}
