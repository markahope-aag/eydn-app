import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidEmail } from "@/lib/validation";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";
import { sendEmail } from "@/lib/email";
import { getNewsletterWelcomeEmail } from "@/lib/email-newsletter";
import { Resend } from "resend";

async function syncToResendAudience(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_NEWSLETTER_AUDIENCE_ID;
  if (!apiKey || !audienceId) return;
  try {
    const resend = new Resend(apiKey);
    await resend.contacts.create({
      email,
      audienceId,
      unsubscribed: false,
    });
  } catch (err) {
    console.error("[NEWSLETTER] Resend audience sync failed:", err instanceof Error ? err.message : err);
  }
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
    // Already on the list — don't re-send the welcome email, but still sync to
    // Resend in case the audience is newer than the waitlist entry.
    await syncToResendAudience(email);
    logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
    return NextResponse.json({ success: true });
  }

  const { error: insertError } = await supabase
    .from("waitlist")
    .insert({ name: email.split("@")[0], email, source: "newsletter" });

  if (insertError) {
    if (insertError.message.includes("unique") || insertError.message.includes("duplicate")) {
      await syncToResendAudience(email);
      logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
      return NextResponse.json({ success: true });
    }
    console.error("[NEWSLETTER]", insertError.message);
    logRequest("POST", "/api/public/newsletter", 500, Date.now() - start);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  // Fire-and-forget side effects — don't block the response on Resend.
  const template = getNewsletterWelcomeEmail();
  void sendEmail({ to: email, subject: template.subject, html: template.html });
  void syncToResendAudience(email);

  logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
  return NextResponse.json({ success: true });
}
