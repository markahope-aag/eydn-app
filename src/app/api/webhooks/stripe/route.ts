import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata;

      if (!meta?.vendor_account_id || !meta?.tier_id) break;

      // Calculate expiration based on billing period
      const now = new Date();
      const expiresAt = new Date(now);
      const billingPeriod = (meta.billing_period || "monthly") as "monthly" | "quarterly" | "annual";
      switch (billingPeriod) {
        case "quarterly":
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          break;
        case "annual":
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          break;
        default:
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          break;
      }

      // Create vendor placement record
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
      const { error: placementError } = await supabase
        .from("vendor_placements")
        .insert({
          vendor_account_id: meta.vendor_account_id,
          tier_id: meta.tier_id,
          billing_period: billingPeriod,
          amount_paid: amountPaid,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          auto_renew: true,
        });

      if (placementError) {
        console.error("Failed to create placement:", placementError.message);
      }

      // Mark vendor account as preferred and update matching suggested_vendor as featured
      const { data: vendor } = await supabase
        .from("vendor_accounts")
        .select("id, business_name, category")
        .eq("id", meta.vendor_account_id)
        .single();

      if (vendor) {
        await supabase
          .from("vendor_accounts")
          .update({ is_preferred: true })
          .eq("id", vendor.id);

        await supabase
          .from("suggested_vendors")
          .update({ featured: true })
          .eq("name", vendor.business_name)
          .eq("category", vendor.category);
      }

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;

      if (subscriptionId) {
        await supabase
          .from("vendor_placements")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
      }

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("vendor_placements")
        .update({
          status: "cancelled",
          auto_renew: false,
        })
        .eq("stripe_subscription_id", subscription.id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
