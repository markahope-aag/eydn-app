import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin, untypedClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleChargeRefunded,
  handleDisputeCreated,
  type AdminSupabase,
} from "./handlers";

type EventHandler = (supabase: AdminSupabase, event: Stripe.Event) => Promise<void>;

/**
 * Dispatch map: each Stripe webhook event type routes to a dedicated
 * handler in ./handlers. Unmapped events are acknowledged with 200
 * (Stripe will stop retrying) but do nothing.
 *
 * NOTE: the Stripe Dashboard webhook endpoint must have every event below
 * enabled. `customer.subscription.created` in particular is required for
 * cron-converted Pro Monthly subscribers to receive access.
 */
const EVENT_HANDLERS: Partial<Record<Stripe.Event.Type, EventHandler>> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "customer.subscription.created": handleSubscriptionCreated,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "invoice.payment_failed": handleInvoicePaymentFailed,
  "charge.refunded": handleChargeRefunded,
  "charge.dispute.created": handleDisputeCreated,
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const handler = EVENT_HANDLERS[event.type];
  if (!handler) {
    // Unmapped event — acknowledge so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseAdmin();

  // Idempotency: claim this event id before dispatching. Stripe delivers
  // webhooks at-least-once, so a retried delivery must not re-run the
  // handler (which could double-insert purchases or double-grant access).
  const { error: claimError } = await untypedClient(supabase)
    .from("processed_stripe_events")
    .insert({ event_id: event.id, event_type: event.type });

  if (claimError) {
    // 23505 = unique_violation → event already processed → ack and skip.
    if ((claimError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Any other DB error → 500 so Stripe retries the delivery later. Log
    // only the safe fields; the raw Supabase error object can include the
    // SQL string in its `message`/`details`, which leaks schema details
    // into server logs.
    const safe = claimError as { code?: string; message?: string };
    console.error("[STRIPE WEBHOOK] Failed to record event", {
      code: safe.code,
      message: safe.message,
    });
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  try {
    await handler(supabase, event);
  } catch (err) {
    // Release the claim so Stripe's retry reprocesses the event.
    await untypedClient(supabase)
      .from("processed_stripe_events")
      .delete()
      .eq("event_id", event.id);
    console.error(`[STRIPE WEBHOOK] Handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
