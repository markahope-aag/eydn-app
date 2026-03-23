import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";
import type { Database } from "@/lib/supabase/types";

type RsvpTokenRow = Database["public"]["Tables"]["rsvp_tokens"]["Row"];

export async function POST(request: Request) {
  const start = Date.now();
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`rsvp:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    logRequest("POST", "/api/public/rsvp", 429, Date.now() - start, { ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
  const supabase = createSupabaseAdmin();
  const body = await request.json();

  const { token, rsvp_status, meal_preference, plus_one_name } = body;

  if (!token || !rsvp_status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ALLOWED_RSVP = ["accepted", "declined", "maybe", "pending"];
  if (!ALLOWED_RSVP.includes(rsvp_status)) {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  if (meal_preference && (typeof meal_preference !== "string" || meal_preference.length > 200)) {
    return NextResponse.json({ error: "Meal preference too long" }, { status: 400 });
  }

  if (plus_one_name && (typeof plus_one_name !== "string" || plus_one_name.length > 200)) {
    return NextResponse.json({ error: "Plus-one name too long" }, { status: 400 });
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
    console.error("[RSVP] Guest update failed:", guestError.message);
    return NextResponse.json({ error: "Failed to save RSVP" }, { status: 500 });
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
    console.error("[RSVP] Token update failed:", updateError.message);
    return NextResponse.json({ error: "Failed to save RSVP" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
