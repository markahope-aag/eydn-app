import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`subscribe-monthly:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Monthly subscription is not configured" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("subscriber_purchases")
    .select("id, plan")
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
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const stripe = getStripe();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        user_id: userId,
        wedding_id: wedding?.id || "",
        type: "pro_monthly_subscription",
      },
    },
    metadata: {
      user_id: userId,
      wedding_id: wedding?.id || "",
      type: "pro_monthly_subscription",
    },
    client_reference_id: userId,
    success_url: `${appUrl}/dashboard?subscribed=monthly`,
    cancel_url: `${appUrl}/dashboard/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
