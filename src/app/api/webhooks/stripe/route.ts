import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  type AdminSupabase,
} from "./handlers";

type EventHandler = (supabase: AdminSupabase, event: Stripe.Event) => Promise<void>;

/**
 * Dispatch map: each Stripe webhook event type routes to a dedicated
 * handler in ./handlers. Unmapped events are acknowledged with 200
 * (Stripe will stop retrying) but do nothing.
 */
const EVENT_HANDLERS: Partial<Record<Stripe.Event.Type, EventHandler>> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
  "invoice.payment_failed": handleInvoicePaymentFailed,
};

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

  const handler = EVENT_HANDLERS[event.type];
  if (handler) {
    const supabase = createSupabaseAdmin();
    await handler(supabase, event);
  }

  return NextResponse.json({ received: true });
}
