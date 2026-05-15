-- Expand subscriber_purchases.status to cover the Pro Monthly lifecycle.
--
-- The original 2026-03-20 constraint only allowed ('active', 'refunded'),
-- but the Stripe webhook handlers in src/app/api/webhooks/stripe/handlers.ts
-- now write 'past_due' (on invoice.payment_failed and on subscription updates
-- transitioning to past_due) and 'cancelled' (on subscription cancel or
-- delete). Without this migration those UPDATEs silently fail the constraint
-- and the row keeps status='active', leaving cancelled users with
-- indefinite Pro access.

ALTER TABLE public.subscriber_purchases
  DROP CONSTRAINT IF EXISTS subscriber_purchases_status_check;

ALTER TABLE public.subscriber_purchases
  ADD CONSTRAINT subscriber_purchases_status_check
  CHECK (status IN ('active', 'refunded', 'past_due', 'cancelled'));
