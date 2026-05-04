import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { captureServer } from "@/lib/analytics-server";
import { requireCronAuth } from "@/lib/cron-auth";

const MAX_RETRIES = 1;

/**
 * Hourly cron: charges due scheduled_subscriptions rows.
 *
 * For each pending row with scheduled_for <= now():
 *   - pro_monthly → create a Stripe subscription (webhook handles the upsert)
 *   - lifetime    → create + confirm a PaymentIntent off-session (webhook handles upsert)
 *   - on failure  → increment failure_count; after MAX_RETRIES failures, mark failed
 *
 * Schedule: 0 * * * * (hourly)
 * Auth: Bearer BACKUP_SECRET
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

        await stripe.subscriptions.create({
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
        });
      } else {
        await stripe.paymentIntents.create({
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
        });

        await supabase.from("subscriber_purchases").insert({
          user_id: row.user_id,
          wedding_id: row.wedding_id,
          plan: "lifetime",
          amount: 79,
          status: "active",
          stripe_customer_id: row.stripe_customer_id,
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
