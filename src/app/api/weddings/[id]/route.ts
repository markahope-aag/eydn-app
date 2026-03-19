import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/weddings/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;

  // Ensure the user can only update their own wedding
  if (wedding.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: Database["public"]["Tables"]["weddings"]["Update"] = await request.json();
  const { data, error } = await supabase
    .from("weddings")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
