import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, isOneOf } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("ceremony_positions")
    .select()
    .eq("wedding_id", wedding.id)
    .order("position_order", { ascending: true });

  const err = supabaseError(error, "ceremony");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["person_name", "person_type"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (!isOneOf(body.person_type, ["wedding_party", "officiant", "couple"])) {
    return NextResponse.json({ error: "person_type must be one of: wedding_party, officiant, couple" }, { status: 400 });
  }

  if (body.side !== undefined && body.side !== null && !isOneOf(body.side, ["left", "right", "center"])) {
    return NextResponse.json({ error: "side must be one of: left, right, center" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ceremony_positions")
    .insert({
      wedding_id: wedding.id,
      person_type: body.person_type as "wedding_party" | "officiant" | "couple",
      person_id: (body.person_id as string) || null,
      person_name: body.person_name as string,
      role: (body.role as string) || null,
      side: (body.side as "left" | "right" | "center") || "center",
      position_order: (body.position_order as number) || 0,
    })
    .select()
    .single();

  const err = supabaseError(error, "ceremony");
  if (err) return err;

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.position_order !== undefined) updates.position_order = body.position_order;
  if (body.role !== undefined) updates.role = body.role;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ceremony_positions")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "ceremony");
  if (err) return err;

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ceremony_positions")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "ceremony");
  if (err) return err;

  return NextResponse.json({ success: true });
}
