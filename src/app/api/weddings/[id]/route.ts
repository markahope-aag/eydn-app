import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields } from "@/lib/validation";

const ALLOWED_FIELDS = [
  "partner1_name", "partner2_name", "date", "venue", "budget",
  "guest_count_estimate", "style_description",
  "has_wedding_party", "wedding_party_count",
  "has_pre_wedding_events", "has_honeymoon", "key_decisions",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/weddings/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;

  if (wedding.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("weddings")
    .update({
      ...updates,
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
