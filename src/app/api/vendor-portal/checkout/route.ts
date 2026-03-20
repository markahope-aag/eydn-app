import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Verify vendor account exists and is approved
  const { data: vendor } = await supabase
    .from("vendor_accounts")
    .select("id, status, business_name")
    .eq("user_id", userId)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor account not found" }, { status: 404 });
  }

  if (vendor.status !== "approved") {
    return NextResponse.json(
      { error: "Vendor account must be approved before purchasing a placement" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { tier_id, billing_period } = body;

  if (!tier_id || !billing_period) {
    return NextResponse.json(
      { error: "tier_id and billing_period are required" },
      { status: 400 }
    );
  }

  if (!["monthly", "quarterly", "annual"].includes(billing_period)) {
    return NextResponse.json(
      { error: "billing_period must be monthly, quarterly, or annual" },
      { status: 400 }
    );
  }

  // Look up the tier
  const { data: tier } = await supabase
    .from("placement_tiers")
    .select("id, name, description, price_monthly, price_quarterly, price_annual")
    .eq("id", tier_id)
    .eq("active", true)
    .single();

  if (!tier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  // Calculate price based on billing period
  let unitAmount: number;
  let intervalCount: number;

  switch (billing_period) {
    case "quarterly":
      unitAmount = Math.round(tier.price_quarterly * 100);
      intervalCount = 3;
      break;
    case "annual":
      unitAmount = Math.round(tier.price_annual * 100);
      intervalCount = 12;
      break;
    default: // monthly
      unitAmount = Math.round(tier.price_monthly * 100);
      intervalCount = 1;
      break;
  }

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tier.name} Placement - ${billing_period}`,
              description: tier.description || `${tier.name} vendor placement tier`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: "month",
              interval_count: intervalCount,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        vendor_account_id: vendor.id,
        tier_id: tier.id,
        billing_period,
        user_id: userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor-portal?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor-portal?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
