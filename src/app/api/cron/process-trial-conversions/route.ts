import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { captureServer } from "@/lib/analytics-server";
import { requireCronAuth } from "@/lib/cron-auth";

const MAX_RETRIES = 1;

/**
 * Hourly cron: charges due scheduled_subscriptions rows.
 *
 * Each row is claimed atomically (pending -> processing) before any Stripe
 * call, so two overlapping cron runs cannot both charge the same card.
 * Stripe idempotency keys provide a second layer of double-charge defence.
 *
 * For each due row:
 *   - pro_monthly → create a Stripe subscription; the subscriber_purchases
 *                   row is written by the customer.subscription.created
 *                   webhook (handleSubscriptionCreated).
 *   - lifetime    → create + confirm a PaymentIntent off-session and insert
 *                   the subscriber_purchases row directly.
 *   - on failure  → increment failure_count; after MAX_RETRIES, mark failed.
 *
 * Schedule: 0 * * * * (hourly)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const stripe = getStripe();
  const nowIso = new Date().toISOString();

  const { data: due } = await supabase
    .from("scheduled_subscriptions")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso);

  const rows = (due || []) as Array<{
    id: string;
    user_id: string;
    wedding_id: string | null;
    stripe_customer_id: string;
    stripe_payment_method_id: string;
    plan: string;
    failure_count: number;
  }>;

  const results = { processed: 0, failed: 0, skipped: 0 };

  for (const row of rows) {
    // Atomically claim the row: pending -> processing. The status guard
    // means only one cron run can win this update; a concurrent run sees
    // zero updated rows and skips, so the card is never charged twice.
    const { data: claimed, error: claimErr } = await supabase
      .from("scheduled_subscriptions")
      .update({ status: "processing", updated_at: nowIso })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");

    if (claimErr || !claimed || claimed.length === 0) {
      results.skipped++;
      continue;
    }

    // Idempotency key for the Stripe call — keyed on row id + attempt.
    // Same key within an attempt (no double charge if the call is retried);
    // a real retry next hour has an incremented failure_count, so it gets a
    // fresh key and actually re-attempts the charge.
    const idempotencyKey = `sched-${row.id}-${row.failure_count}`;

    try {
      // Skip if the user already has an active purchase from some other path
      const { data: existing } = await supabase
        .from("subscriber_purchases")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("scheduled_subscriptions")
          .update({ status: "superseded", processed_at: nowIso, updated_at: nowIso })
          .eq("id", row.id);
        results.skipped++;
        continue;
      }

      if (row.plan === "pro_monthly") {
        const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
        if (!priceId) throw new Error("STRIPE_PRO_MONTHLY_PRICE_ID not set");

        // The subscriber_purchases row is created by the
        // customer.subscription.created webhook (handleSubscriptionCreated).
        await stripe.subscriptions.create(
          {
            customer: row.stripe_customer_id,
            items: [{ price: priceId }],
            default_payment_method: row.stripe_payment_method_id,
            off_session: true,
            metadata: {
              user_id: row.user_id,
              wedding_id: row.wedding_id || "",
              type: "pro_monthly_subscription",
              source: "trial_auto_convert",
            },
          },
          { idempotencyKey }
        );
      } else {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: 7900,
            currency: "usd",
            customer: row.stripe_customer_id,
            payment_method: row.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            metadata: {
              user_id: row.user_id,
              wedding_id: row.wedding_id || "",
              type: "subscriber_purchase",
              source: "trial_auto_convert",
            },
          },
          { idempotencyKey }
        );

        await supabase.from("subscriber_purchases").insert({
          user_id: row.user_id,
          wedding_id: row.wedding_id,
          plan: "lifetime",
          amount: 79,
          status: "active",
          stripe_customer_id: row.stripe_customer_id,
          stripe_payment_intent_id: paymentIntent.id,
          payment_method: "stripe",
        });
      }

      await supabase
        .from("scheduled_subscriptions")
        .update({ status: "processed", processed_at: nowIso, updated_at: nowIso })
        .eq("id", row.id);

      await captureServer(row.user_id, "trial_auto_converted", {
        plan: row.plan,
      });
      results.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const nextCount = row.failure_count + 1;
      const newStatus = nextCount > MAX_RETRIES ? "failed" : "pending";

      await supabase
        .from("scheduled_subscriptions")
        .update({
          failure_count: nextCount,
          last_failure_message: message,
          status: newStatus,
          updated_at: nowIso,
        })
        .eq("id", row.id);

      if (newStatus === "failed") {
        await captureServer(row.user_id, "trial_auto_convert_failed", {
          plan: row.plan,
          reason: message,
        });
      }
      results.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}

// Vercel cron always sends GET; admin manual-trigger UI POSTs internally.
// Re-export so both work.
export const POST = GET;
