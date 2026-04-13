-- Add Pro Monthly subscription support to subscriber_purchases.
-- Existing rows ($79 Lifetime) get plan = 'lifetime' via DEFAULT.
ALTER TABLE public.subscriber_purchases
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'lifetime',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscriber_purchases
  DROP CONSTRAINT IF EXISTS subscriber_purchases_plan_check;

ALTER TABLE public.subscriber_purchases
  ADD CONSTRAINT subscriber_purchases_plan_check
  CHECK (plan IN ('lifetime', 'pro_monthly'));

CREATE UNIQUE INDEX IF NOT EXISTS subscriber_purchases_stripe_subscription_id_idx
  ON public.subscriber_purchases (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
