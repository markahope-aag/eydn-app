import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics-server";
import { handoffCalculatorToEydn } from "@/lib/calculator-handoff";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { getCalculatorEmail } from "@/lib/email-calculator";
import { cadenceSubscribe } from "@/lib/cadence";
import crypto from "crypto";

function generateShortCode(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 7);
}

// Same breakdown percentages used by the calculator UI (see
// src/components/tools/WeddingBudgetCalculator.tsx). Keep in sync.
const BREAKDOWN = [
  { label: "Venue", pct: 0.238 },
  { label: "Catering & bar", pct: 0.192 },
  { label: "Photography & video", pct: 0.12 },
  { label: "Florals & decor", pct: 0.09 },
  { label: "Attire & beauty", pct: 0.065 },
  { label: "Music & entertainment", pct: 0.06 },
  { label: "Rehearsal dinner", pct: 0.04 },
  { label: "Stationery & gifts", pct: 0.025 },
  { label: "Transportation", pct: 0.02 },
  { label: "Ceremony & officiant", pct: 0.015 },
];

function buildAllocations(budget: number) {
  return BREAKDOWN.map((row) => ({
    label: row.label,
    pct: row.pct,
    amount: Math.round(budget * row.pct),
  }));
}

function syncToCadenceNewsletter(
  email: string,
  firstName: string | null
): Promise<void> {
  return cadenceSubscribe({
    formId: process.env.CADENCE_NEWSLETTER_FORM_ID || "",
    email,
    firstName,
  });
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

  // Per-email rate limit on the account-creating handoff. The outer IP
  // bucket caught at the top of this route only stops single-IP spam;
  // this second bucket stops an attacker rotating IPs from burning
  // Clerk's quota by submitting thousands of distinct emails. If we hit
  // the limit we still save the calculator row (already done above)
  // and return the short_code link, but skip the Clerk + email path.
  const emailRl = await checkRateLimit(
    `calculator-handoff:${normalizedEmail}`,
    RATE_LIMITS.accountCreationByEmail
  );
  if (emailRl.limited) {
    return NextResponse.json({
      short_code: shortCode,
      sign_in_url: null,
      is_new_user: null,
    }, { status: existing ? 200 : 201 });
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

  // Email 1 of the calculator nurture — inline breakdown + sign-in link.
  // Fire-and-forget so the user-facing response never blocks on Resend.
  const template = getCalculatorEmail({
    firstName: normalizedName,
    budget,
    guests,
    state,
    allocations: buildAllocations(budget),
    signInUrl: handoff?.signInUrl || null,
    isNewUser: handoff?.isNewUser ?? true,
  });
  void sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
  });

  // Push into Cadence so the couple joins the weekly planning nurture.
  void syncToCadenceNewsletter(normalizedEmail, normalizedName);

  return NextResponse.json({
    short_code: shortCode,
    sign_in_url: handoff?.signInUrl || null,
    is_new_user: handoff?.isNewUser ?? null,
  }, { status: existing ? 200 : 201 });
}

// The GET handler was removed — the saved-calculator share link is
// served by the server component at
// /tools/wedding-budget-calculator/s/[code]/page.tsx which reads from
// Supabase directly and never returns the email. Keeping a second
// public GET endpoint would have re-introduced the PII enumeration
// surface the audit flagged.
