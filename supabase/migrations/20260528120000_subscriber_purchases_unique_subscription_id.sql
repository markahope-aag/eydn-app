-- Stripe webhook handlers upsert subscriber_purchases on stripe_subscription_id
-- to stay idempotent across retried webhook deliveries. Without this UNIQUE
-- constraint the upsert fails with Postgres 42P10 ("no unique or exclusion
-- constraint matching the ON CONFLICT specification"), the handler swallows
-- the error and returns 200 to Stripe, and the purchase row is never written —
-- so the user keeps showing as trialing despite a successful payment.

ALTER TABLE subscriber_purchases
  ADD CONSTRAINT subscriber_purchases_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);
