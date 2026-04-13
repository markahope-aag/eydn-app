import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics-server";
import { handoffCalculatorToEydn } from "@/lib/calculator-handoff";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import crypto from "crypto";

function generateShortCode(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 7);
}

/** POST — save a calculator state, hand off into Eydn, return a sign-in URL */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`calculator-save:${ip}`, RATE_LIMITS.auth);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const { name, email, budget, guests, state, month } = body as {
    name?: string;
    email?: string;
    budget?: number;
    guests?: number;
    state?: string;
    month?: number;
  };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (budget == null || guests == null || state == null || month == null) {
    return NextResponse.json({ error: "All calculator fields are required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name?.trim() || null;
  const supabase = createSupabaseAdmin();

  // Check if this email already has a save — update it instead of creating a duplicate
  const { data: existing } = await supabase
    .from("calculator_saves")
    .select("id, short_code")
    .eq("email", normalizedEmail)
    .maybeSingle();

  let shortCode: string;

  if (existing) {
    await supabase
      .from("calculator_saves")
      .update({ name: normalizedName, budget, guests, state, month })
      .eq("id", existing.id);
    shortCode = (existing as { short_code: string }).short_code;

    await captureServer(normalizedEmail, "calculator_completed", {
      total_budget: budget,
      guest_count: guests,
      state,
      email_captured: true,
      calculator_session_id: shortCode,
      returning: true,
    });
  } else {
    shortCode = generateShortCode();
    const { error } = await supabase.from("calculator_saves").insert({
      short_code: shortCode,
      name: normalizedName,
      email: normalizedEmail,
      budget,
      guests,
      state,
      month,
    });

    if (error) {
      return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
    }

    await captureServer(normalizedEmail, "calculator_completed", {
      total_budget: budget,
      guest_count: guests,
      state,
      email_captured: true,
      calculator_session_id: shortCode,
      returning: false,
    });
  }

  // Hand the user off into Eydn — find or create their Clerk account,
  // seed a wedding with the budget pre-loaded, return a sign-in URL.
  const handoff = await handoffCalculatorToEydn(supabase, {
    email: normalizedEmail,
    name: normalizedName,
    budget,
    guests,
    state,
    month,
  });

  if (handoff) {
    await captureServer(normalizedEmail, "calculator_handoff", {
      is_new_user: handoff.isNewUser,
      wedding_id: handoff.weddingId,
    });
  }

  return NextResponse.json({
    short_code: shortCode,
    sign_in_url: handoff?.signInUrl || null,
    is_new_user: handoff?.isNewUser ?? null,
  }, { status: existing ? 200 : 201 });
}

/** GET — load a saved calculator state by short code */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("calculator_saves")
    .select("name, budget, guests, state, month")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Calculator not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
