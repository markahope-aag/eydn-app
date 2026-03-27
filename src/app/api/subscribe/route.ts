import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_PRICE } from "@/lib/subscription";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Check if already purchased
  const { data: purchase } = await supabase
    .from("subscriber_purchases")
    .select("id, purchased_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (purchase) {
    return NextResponse.json({ purchased: true, purchased_at: (purchase as { purchased_at: string }).purchased_at });
  }

  return NextResponse.json({ purchased: false });
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`subscribe:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Check if already purchased
  const { data: existing } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already purchased" }, { status: 400 });
  }

  // Get wedding ID
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .single();

  // Check for promo code
  let promoCode: string | null = null;
  let promoId: string | null = null;
  let finalAmount = SUBSCRIPTION_PRICE;
  let discountAmount = 0;

  try {
    const parsed = await safeParseJSON(request);
    if (!isParseError(parsed) && parsed.promoCode) {
      promoCode = ((parsed.promoCode as string) || "").trim().toUpperCase();
    }
  } catch {
    // No body or invalid JSON — proceed without promo code
  }

  if (promoCode) {
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode)
      .eq("is_active", true)
      .single();

    if (promo) {
      const expired = promo.expires_at && new Date(promo.expires_at) < new Date();
      const maxed = promo.max_uses !== null && promo.current_uses >= promo.max_uses;

      // Check user hasn't already redeemed
      const { data: alreadyUsed } = await supabase
        .from("promo_code_redemptions")
        .select("id")
        .eq("promo_code_id", promo.id)
        .eq("user_id", userId)
        .limit(1);

      if (!expired && !maxed && (!alreadyUsed || alreadyUsed.length === 0)) {
        promoId = promo.id;
        if (promo.discount_type === "percentage") {
          discountAmount = Math.round(SUBSCRIPTION_PRICE * (promo.discount_value / 100) * 100) / 100;
        } else {
          discountAmount = Math.min(promo.discount_value, SUBSCRIPTION_PRICE);
        }
        finalAmount = Math.max(0, SUBSCRIPTION_PRICE - discountAmount);
      }
    }
  }

  // Handle $0 purchase (100% discount) — skip Stripe
  if (finalAmount === 0 && promoId) {
    const { data: purchase } = await supabase
      .from("subscriber_purchases")
      .insert({
        user_id: userId,
        wedding_id: wedding?.id || null,
        status: "active",
        amount: 0,
        purchased_at: new Date().toISOString(),
        payment_method: "promo_code",
      })
      .select("id")
      .single();

    // Record redemption
    await supabase.from("promo_code_redemptions").insert({
      promo_code_id: promoId,
      user_id: userId,
      purchase_id: (purchase as { id: string } | null)?.id || null,
      original_amount: SUBSCRIPTION_PRICE,
      discount_amount: discountAmount,
      final_amount: 0,
    });

    // Atomic increment usage counter
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- RPC not in generated types yet
    await (supabase.rpc as Function)("increment_promo_uses", { code_id: promoId });

    return NextResponse.json({
      purchased: true,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard?purchased=true`,
    });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Eydn Wedding Planner",
            description: promoId
              ? `Full access — ${promoCode} applied (saved $${discountAmount.toFixed(2)})`
              : "Full access to all features for 1 wedding — AI chat, PDF exports, file attachments, and more.",
          },
          unit_amount: Math.round(finalAmount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      wedding_id: wedding?.id || "",
      type: "subscriber_purchase",
      ...(promoId ? { promo_code_id: promoId, promo_code: promoCode!, discount_amount: String(discountAmount) } : {}),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard?purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
