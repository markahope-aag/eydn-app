import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Get all assignments for this wedding's tables (single join query)
  const { data, error } = await supabase
    .from("seat_assignments")
    .select("*, seating_tables!inner(wedding_id)")
    .eq("seating_tables.wedding_id", wedding.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["seating_table_id", "guest_id"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const guestId = body.guest_id as string;
  const tableId = body.seating_table_id as string;

  // Verify guest belongs to this wedding and is not deleted
  const { data: guest } = await supabase
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .single();

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  // Verify table belongs to this wedding and is not deleted
  const { data: table } = await supabase
    .from("seating_tables")
    .select("id")
    .eq("id", tableId)
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .single();

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  // Atomic upsert — avoids race condition where two concurrent drags
  // of the same guest could cause ghost seats (DELETE then INSERT
  // was not atomic; two requests could interleave)
  const { data, error } = await supabase
    .from("seat_assignments")
    .upsert(
      {
        seating_table_id: tableId,
        guest_id: guestId,
        seat_number: (body.seat_number as number) || null,
      },
      { onConflict: "guest_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const guestId = url.searchParams.get("guest_id");

  if (!guestId) {
    return NextResponse.json({ error: "guest_id required" }, { status: 400 });
  }

  // Verify guest belongs to this wedding
  const { data: guest } = await supabase
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("wedding_id", wedding.id)
    .single();

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("seat_assignments")
    .delete()
    .eq("guest_id", guestId);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
