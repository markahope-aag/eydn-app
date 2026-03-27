import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("wedding_party")
    .select()
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const err = supabaseError(error, "wedding-party");
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

  const missing = requireFields(body, ["name", "role"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const allowed = pickFields(body, ["email", "phone", "job_assignment", "attire", "sort_order", "address_line1", "address_line2", "city", "state", "zip"]);
  const { data, error } = await supabase
    .from("wedding_party")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      role: body.role as string,
      ...allowed,
    })
    .select()
    .single();

  const err = supabaseError(error, "wedding-party");
  if (err) return err;

  // Auto-add as guest if not already on guest list (skip if flagged to prevent loops)
  if (!body._skip_sync) {
    const name = body.name as string;
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("wedding_id", wedding.id)
      .eq("name", name)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (!existingGuest) {
      await supabase.from("guests").insert({
        wedding_id: wedding.id,
        name,
        email: (body.email as string) || null,
        phone: (body.phone as string) || null,
        role: "wedding_party",
        rsvp_status: "accepted",
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
