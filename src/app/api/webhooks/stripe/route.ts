import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SUBSCRIPTION_PRICE } from "@/lib/subscription";
import { captureServer } from "@/lib/analytics-server";
import Stripe from "stripe";

async function classifyWindow(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userId: string
): Promise<"trial_expiry" | "post_downgrade" | "other"> {
  const { data } = await supabase
    .from("weddings")
    .select("trial_started_at, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "other";
  const trialStart = new Date(
    (data as { trial_started_at: string | null; created_at: string }).trial_started_at ||
      (data as { trial_started_at: string | null; created_at: string }).created_at
  );
  const daysSinceTrialStart =
    (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceTrialStart <= 14) return "trial_expiry";
  return "post_downgrade";
}

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

      // Handle setup-mode checkout — card saved for future trial auto-convert
      if (session.mode === "setup" && meta?.intent === "trial_auto_convert" && meta.user_id) {
        const setupIntentId = session.setup_intent as string | null;
        if (setupIntentId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
          const paymentMethodId = setupIntent.payment_method as string | null;
          let customerId = (setupIntent.customer as string | null) || (session.customer as string | null);

          if (!customerId && paymentMethodId) {
            const customer = await stripe.customers.create({
              payment_method: paymentMethodId,
              metadata: { user_id: meta.user_id, wedding_id: meta.wedding_id || "" },
            });
            customerId = customer.id;
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          } else if (customerId && paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }).catch(() => {});
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          }

          if (customerId && paymentMethodId) {
            await supabase
              .from("scheduled_subscriptions")
              .update({ status: "superseded", updated_at: new Date().toISOString() })
              .eq("user_id", meta.user_id)
              .eq("status", "pending");

            await supabase.from("scheduled_subscriptions").insert({
              user_id: meta.user_id,
              wedding_id: meta.wedding_id || null,
              stripe_customer_id: customerId,
              stripe_payment_method_id: paymentMethodId,
              plan: meta.plan === "lifetime" ? "lifetime" : "pro_monthly",
              scheduled_for: meta.scheduled_for || new Date().toISOString(),
              status: "pending",
            });

            await captureServer(meta.user_id, "trial_card_saved", {
              plan: meta.plan,
              scheduled_for: meta.scheduled_for,
            });
          }
        }
        break;
      }

      // Handle Pro Monthly subscription checkout
      if (meta?.type === "pro_monthly_subscription" && meta?.user_id) {
        const subscriptionId = session.subscription as string | null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = subscription.items.data[0]?.current_period_end;

          await supabase.from("subscriber_purchases").upsert(
            {
              user_id: meta.user_id,
              wedding_id: meta.wedding_id || null,
              plan: "pro_monthly",
              amount: 14.99,
              status: "active",
              stripe_session_id: session.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: (subscription.customer as string) || null,
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              purchased_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );

          const window = await classifyWindow(supabase, meta.user_id);
          await captureServer(meta.user_id, "paid_conversion", {
            plan: "pro_monthly",
            amount: 14.99,
            window,
            stripe_subscription_id: subscription.id,
          });
        }
        break;
      }

      // Handle subscriber one-time purchase
      if (meta?.type === "subscriber_purchase" && meta?.user_id) {
        const purchaseAmount = session.amount_total ? session.amount_total / 100 : SUBSCRIPTION_PRICE;
        const { data: purchase } = await supabase.from("subscriber_purchases").insert({
          user_id: meta.user_id,
          wedding_id: meta.wedding_id || null,
          plan: "lifetime",
          amount: purchaseAmount,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_session_id: session.id,
          status: "active",
        }).select("id").single();

        const window = await classifyWindow(supabase, meta.user_id);
        await captureServer(meta.user_id, "paid_conversion", {
          plan: "lifetime",
          amount: purchaseAmount,
          window,
          promo_code: meta.promo_code || null,
        });

        // Record promo code redemption if applicable
        if (meta.promo_code_id && purchase) {
          await supabase.from("promo_code_redemptions").insert({
            promo_code_id: meta.promo_code_id,
            user_id: meta.user_id,
            purchase_id: (purchase as { id: string }).id,
            original_amount: SUBSCRIPTION_PRICE,
            discount_amount: Number(meta.discount_amount) || 0,
            final_amount: session.amount_total ? session.amount_total / 100 : SUBSCRIPTION_PRICE,
          });

          // Atomic increment promo code usage
          await supabase.rpc("increment_promo_uses", { code_id: meta.promo_code_id });
        }
        break;
      }

      // Handle Memory Plan subscription
      if (meta?.type === "memory_plan" && meta?.wedding_id) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        await supabase
          .from("weddings")
          .update({
            memory_plan_active: true,
            memory_plan_expires_at: expiresAt.toISOString(),
          })
          .eq("id", meta.wedding_id);
        break;
      }

      // Vendor placement purchases are no longer accepted — Eydn charges
      // couples, never vendors. Any stray session with vendor_account_id /
      // tier_id metadata is ignored here. See /pledge.
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = subscription.items.data[0]?.current_period_end;

      if (subscription.metadata?.type === "pro_monthly_subscription") {
        const isActive =
          subscription.status === "active" || subscription.status === "trialing";
        await supabase
          .from("subscriber_purchases")
          .update({
            status: isActive ? "active" : subscription.status === "past_due" ? "past_due" : "cancelled",
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.type === "pro_monthly_subscription") {
          const periodEnd = subscription.items.data[0]?.current_period_end;
          await supabase
            .from("subscriber_purchases")
            .update({
              status: "active",
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
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
          .from("subscriber_purchases")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
      }

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Pro Monthly cancellation — downgrade user to free tier
      if (subscription.metadata?.type === "pro_monthly_subscription") {
        await supabase
          .from("subscriber_purchases")
          .update({
            status: "cancelled",
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", subscription.id);

        const uid = subscription.metadata?.user_id;
        if (uid) {
          const started = subscription.start_date
            ? new Date(subscription.start_date * 1000)
            : null;
          const daysSubscribed = started
            ? Math.round((Date.now() - started.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          await captureServer(uid, "subscription_cancelled", {
            plan: "pro_monthly",
            days_subscribed: daysSubscribed,
          });
        }
      }

      // Handle Memory Plan cancellation
      const cancelMeta = subscription.metadata;
      if (cancelMeta?.type === "memory_plan" && cancelMeta?.wedding_id) {
        await supabase
          .from("weddings")
          .update({
            memory_plan_active: false,
          })
          .eq("id", cancelMeta.wedding_id);
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}
