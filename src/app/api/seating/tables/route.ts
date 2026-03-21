import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields, isOneOf, isValidNumber } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("seating_tables")
    .select()
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("table_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const missing = requireFields(body, ["table_number"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.shape !== undefined && !isOneOf(body.shape, ["round", "rectangle"] as const)) {
    return NextResponse.json({ error: "shape must be one of: round, rectangle" }, { status: 400 });
  }

  if (body.capacity !== undefined && !isValidNumber(body.capacity, 1)) {
    return NextResponse.json({ error: "capacity must be a positive number" }, { status: 400 });
  }

  const allowed = pickFields(body, ["name", "x", "y", "shape", "capacity"]);
  const { data, error } = await supabase
    .from("seating_tables")
    .insert({
      wedding_id: wedding.id,
      table_number: body.table_number as number,
      ...allowed,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
