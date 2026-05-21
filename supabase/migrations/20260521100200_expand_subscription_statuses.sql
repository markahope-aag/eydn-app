-- Two status-domain expansions for the Stripe webhook/cron hardening pass.

-- 1. scheduled_subscriptions gains 'processing'. The trial-conversion cron
--    now claims a row (pending -> processing) before calling Stripe, so two
--    overlapping cron runs cannot both charge the same saved card.
alter table public.scheduled_subscriptions
  drop constraint if exists scheduled_subscriptions_status_check;
alter table public.scheduled_subscriptions
  add constraint scheduled_subscriptions_status_check
  check (status in ('pending', 'processing', 'processed', 'failed', 'cancelled', 'superseded'));

-- 2. subscriber_purchases gains 'disputed'. The webhook now revokes access
--    on charge.dispute.created (chargebacks), kept distinct from a
--    voluntary 'refunded'. Both statuses fall outside the 'active' filter
--    used by getSubscriptionStatus, so either one downgrades the user.
alter table public.subscriber_purchases
  drop constraint if exists subscriber_purchases_status_check;
alter table public.subscriber_purchases
  add constraint subscriber_purchases_status_check
  check (status in ('active', 'refunded', 'past_due', 'cancelled', 'disputed'));
