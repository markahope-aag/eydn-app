import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type RsvpTokenRow = Database["public"]["Tables"]["rsvp_tokens"]["Row"];

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  const body = await request.json();

  const { token, rsvp_status, meal_preference, plus_one_name } = body;

  if (!token || !rsvp_status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Look up token
  const { data: rsvpTokenRaw, error: tokenError } = await supabase
    .from("rsvp_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  const rsvpToken = rsvpTokenRaw as RsvpTokenRow | null;

  if (tokenError || !rsvpToken) {
    return NextResponse.json({ error: "Invalid RSVP token" }, { status: 404 });
  }

  // Update guest record
  const { error: guestError } = await supabase
    .from("guests")
    .update({
      rsvp_status,
      meal_preference: meal_preference || null,
      plus_one_name: plus_one_name || null,
    })
    .eq("id", rsvpToken.guest_id);

  if (guestError) {
    return NextResponse.json({ error: guestError.message }, { status: 500 });
  }

  // Mark token as responded
  const { error: updateError } = await supabase
    .from("rsvp_tokens")
    .update({
      responded: true,
      responded_at: new Date().toISOString(),
    })
    .eq("id", rsvpToken.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
