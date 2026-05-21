-- Webhook idempotency ledger.
--
-- Stripe delivers webhooks at-least-once. Before this table, a retried
-- delivery of checkout.session.completed could insert a duplicate
-- subscriber_purchases row (the Lifetime path used a plain INSERT) and
-- double-increment promo usage. The /api/webhooks/stripe route now claims
-- each event id here before dispatching; a duplicate delivery hits the
-- primary-key conflict and is acknowledged without re-running the handler.
create table if not exists public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;

-- Service role bypasses RLS; with no policy defined, direct client access
-- is denied. Only the webhook route (service role key) touches this table.
