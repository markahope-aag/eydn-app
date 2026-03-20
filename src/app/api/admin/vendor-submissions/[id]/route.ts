import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/vendor-submissions/[id]">
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;
  const body = await request.json();

  // If approving, also add to suggested_vendors
  if (body.status === "approved") {
    const { data: submission } = await supabase
      .from("vendor_submissions")
      .select()
      .eq("id", id)
      .single();

    if (submission) {
      const sub = submission as { name: string; category: string; website: string | null; phone: string | null; email: string | null; city: string | null; state: string | null };
      await supabase.from("suggested_vendors").insert({
        name: sub.name,
        category: sub.category,
        website: sub.website,
        phone: sub.phone,
        email: sub.email,
        city: sub.city || "Unknown",
        state: sub.state || "Unknown",
      });
    }
  }

  const { error } = await supabase
    .from("vendor_submissions")
    .update({ status: body.status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
