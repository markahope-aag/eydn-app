import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields, isValidEmail } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

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

  const missing = requireFields(body, ["name"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.email && !isValidEmail(body.email)) {
    return NextResponse.json({ error: "email is not a valid email address" }, { status: 400 });
  }

  const allowed = pickFields(body, ["email", "rsvp_status", "meal_preference", "plus_one"]);
  const { data, error } = await supabase
    .from("guests")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      ...allowed,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
