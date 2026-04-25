import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidEmail } from "@/lib/validation";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";
import { sendEmail } from "@/lib/email";
import { getNewsletterWelcomeEmail } from "@/lib/email-newsletter";
import { cadenceSubscribe } from "@/lib/cadence";

async function syncNewsletterToCadence(email: string): Promise<void> {
  // Result intentionally discarded — newsletter signups don't have a
  // per-row destination to record sync state on (calculator does, see
  // syncToCadenceAndRecord in /api/tools/calculator-save).
  await cadenceSubscribe({
    formId: process.env.CADENCE_NEWSLETTER_FORM_ID || "",
    email,
  });
}

export async function POST(request: Request) {
  const start = Date.now();
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`newsletter:${ip}`, RATE_LIMITS.auth);
  if (rl.limited) {
    logRequest("POST", "/api/public/newsletter", 429, Date.now() - start, { ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;

  const email = ((parsed.email as string) || "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Check if already subscribed (any source)
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    // Already on the list — don't re-send the welcome email, but still
    // sync to Cadence in case the subscribe form was added later than
    // the historical waitlist entry.
    void syncNewsletterToCadence(email);
    logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
    return NextResponse.json({ success: true });
  }

  const { error: insertError } = await supabase
    .from("waitlist")
    .insert({ name: email.split("@")[0], email, source: "newsletter" });

  if (insertError) {
    if (insertError.message.includes("unique") || insertError.message.includes("duplicate")) {
      void syncNewsletterToCadence(email);
      logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
      return NextResponse.json({ success: true });
    }
    console.error("[NEWSLETTER]", insertError.message);
    logRequest("POST", "/api/public/newsletter", 500, Date.now() - start);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  // Fire-and-forget side effects — never block the response.
  const template = getNewsletterWelcomeEmail();
  void sendEmail({ to: email, subject: template.subject, html: template.html });
  void syncNewsletterToCadence(email);

  logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
  return NextResponse.json({ success: true });
}
