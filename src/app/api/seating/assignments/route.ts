import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Get all assignments for this wedding's tables
  const { data: tables } = await supabase
    .from("seating_tables")
    .select("id")
    .eq("wedding_id", wedding.id);

  if (!tables || tables.length === 0) {
    return NextResponse.json([]);
  }

  const tableIds = tables.map((t: { id: string }) => t.id);
  const { data, error } = await supabase
    .from("seat_assignments")
    .select()
    .in("seating_table_id", tableIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const body = await request.json();

  // Remove existing assignment for this guest
  await supabase
    .from("seat_assignments")
    .delete()
    .eq("guest_id", body.guest_id);

  const { data, error } = await supabase
    .from("seat_assignments")
    .insert({
      seating_table_id: body.seating_table_id,
      guest_id: body.guest_id,
      seat_number: body.seat_number || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const url = new URL(request.url);
  const guestId = url.searchParams.get("guest_id");

  if (!guestId) {
    return NextResponse.json({ error: "guest_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("seat_assignments")
    .delete()
    .eq("guest_id", guestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
