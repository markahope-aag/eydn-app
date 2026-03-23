import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_PRICE } from "@/lib/subscription";

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

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already purchased
  const supabase = createSupabaseAdmin();
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

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Eydn Wedding Planner",
            description: "Full access to all features for 1 wedding — AI chat, PDF exports, file attachments, and more.",
          },
          unit_amount: SUBSCRIPTION_PRICE * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      wedding_id: wedding?.id || "",
      type: "subscriber_purchase",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard?purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
