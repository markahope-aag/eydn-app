import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

function generateShortCode(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 7);
}

/** POST — save a calculator state and return the short code */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, budget, guests, state, month } = body as {
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

  const supabase = createSupabaseAdmin();

  // Check if this email already has a save — update it instead of creating a duplicate
  const { data: existing } = await supabase
    .from("calculator_saves")
    .select("id, short_code")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    await supabase
      .from("calculator_saves")
      .update({ budget, guests, state, month })
      .eq("id", existing.id);

    return NextResponse.json({ short_code: existing.short_code });
  }

  const shortCode = generateShortCode();

  const { error } = await supabase.from("calculator_saves").insert({
    short_code: shortCode,
    email: email.toLowerCase().trim(),
    budget,
    guests,
    state,
    month,
  });

  if (error) {
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  }

  return NextResponse.json({ short_code: shortCode }, { status: 201 });
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
    .select("budget, guests, state, month")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Calculator not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
