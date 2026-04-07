import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidEmail } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

const BETA_CODE = "BETA50";
const WAITLIST_CODE = "WAITLIST20";

/** GET: Check beta availability */
export async function GET(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`beta-get:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const supabase = createSupabaseAdmin();

  const { data: betaCode } = await supabase
    .from("promo_codes")
    .select("max_uses, current_uses, is_active")
    .eq("code", BETA_CODE)
    .single();

  if (!betaCode || !betaCode.is_active) {
    return NextResponse.json({ beta_available: false, slots_remaining: 0 });
  }

  const maxUses = betaCode.max_uses ?? 999;
  const remaining = Math.max(0, maxUses - betaCode.current_uses);

  return NextResponse.json({
    beta_available: remaining > 0,
    slots_remaining: remaining,
    total_slots: maxUses,
    slots_taken: betaCode.current_uses,
  });
}

/** POST: Join waitlist (when beta is full) */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`waitlist:${ip}`, RATE_LIMITS.auth);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;

  const name = ((parsed.name as string) || "").trim();
  const email = ((parsed.email as string) || "").trim().toLowerCase();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ success: true, message: "You're already on the waitlist! Check your email for your discount code." });
  }

  // Add to waitlist
  const { error: insertError } = await supabase
    .from("waitlist")
    .insert({ name, email, source: "beta" });

  if (insertError) {
    if (insertError.message.includes("unique") || insertError.message.includes("duplicate")) {
      return NextResponse.json({ success: true, message: "You're already on the waitlist!" });
    }
    console.error("[WAITLIST]", insertError.message);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  // Send welcome email with discount code
  try {
    await sendEmail({
      to: email,
      subject: "You're on the Eydn waitlist — here's 20% off",
      html: `
        <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
            <img src="https://eydn.app/logo-white.png" alt="Eydn" height="34" style="height: 34px; width: auto;" />
          </div>
          <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
            <h2 style="color: #1A1A2E; font-size: 20px;">You're on the list, ${name.split(" ")[0]}!</h2>
            <p>Thanks for your interest in Eydn. Our beta program is currently full, but we didn't want you to leave empty-handed.</p>
            <p>Here's an exclusive <strong>20% discount</strong> you can use when we open to the public:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; background: #2C3E2D; color: #FAF6F1; font-size: 24px; font-weight: 700; font-family: monospace; padding: 12px 32px; border-radius: 12px; letter-spacing: 3px;">${WAITLIST_CODE}</span>
            </div>
            <p>Use this code at checkout to get <strong>20% off</strong> your Eydn purchase ($79 → $63.20).</p>
            <p>We'll also let you know as soon as we launch. You'll be first in line.</p>
            <p style="text-align: center; margin-top: 24px;">
              <a href="https://eydn.app" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Visit Eydn</a>
            </p>
          </div>
          <div style="padding: 24px; text-align: center; color: #6B6B6B; font-size: 12px;">
            <p>Eydn — Your AI Wedding Planning Guide</p>
            <p style="margin-top: 8px;">Eydn App, 2921 Landmark Place, Suite 215, Madison, WI 53713</p>
          </div>
        </div>
      `,
    });

    // Mark as sent
    await supabase
      .from("waitlist")
      .update({ discount_code_sent: true })
      .eq("email", email);
  } catch {
    // Email failed but signup succeeded
    const redacted = `${email[0]}***@${email.split("@")[1]}`;
    console.error("[WAITLIST] Failed to send welcome email to", redacted);
  }

  return NextResponse.json({
    success: true,
    message: "You're on the waitlist! Check your email for an exclusive 20% discount code.",
  });
}
