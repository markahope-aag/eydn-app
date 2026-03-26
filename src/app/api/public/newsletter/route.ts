import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidEmail } from "@/lib/validation";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";

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
    logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
    return NextResponse.json({ success: true });
  }

  const { error: insertError } = await supabase
    .from("waitlist")
    .insert({ name: email.split("@")[0], email, source: "newsletter" });

  if (insertError) {
    if (insertError.message.includes("unique") || insertError.message.includes("duplicate")) {
      logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
      return NextResponse.json({ success: true });
    }
    console.error("[NEWSLETTER]", insertError.message);
    logRequest("POST", "/api/public/newsletter", 500, Date.now() - start);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  logRequest("POST", "/api/public/newsletter", 200, Date.now() - start);
  return NextResponse.json({ success: true });
}
