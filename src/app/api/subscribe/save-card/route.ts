import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { safeParseJSON, isParseError } from "@/lib/validation";

type Plan = "pro_monthly" | "lifetime";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`save-card:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeParseJSON(request).catch(() => ({}));
  const body = isParseError(parsed) ? {} : (parsed as { plan?: Plan });
  const plan: Plan = body.plan === "lifetime" ? "lifetime" : "pro_monthly";

  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active plan" },
      { status: 400 }
    );
  }

  const { data: wedding } = await supabase
    .from("weddings")
    .select("id, trial_started_at, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!wedding) {
    return NextResponse.json({ error: "No wedding found" }, { status: 400 });
  }

  const w = wedding as { id: string; trial_started_at: string | null; created_at: string };
  const trialStart = new Date(w.trial_started_at || w.created_at);
  const scheduledFor = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    payment_method_types: ["card"],
    setup_intent_data: {
      metadata: {
        user_id: userId,
        wedding_id: w.id,
        intent: "trial_auto_convert",
        plan,
        scheduled_for: scheduledFor.toISOString(),
      },
    },
    metadata: {
      user_id: userId,
      wedding_id: w.id,
      intent: "trial_auto_convert",
      plan,
      scheduled_for: scheduledFor.toISOString(),
    },
    success_url: `${appUrl}/dashboard/billing?card_saved=1`,
    cancel_url: `${appUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
