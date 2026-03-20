-- Subscriber purchases
create table public.subscriber_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  wedding_id uuid references public.weddings(id) on delete set null,
  amount numeric(10,2) not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  status text not null default 'active' check (status in ('active', 'refunded')),
  purchased_at timestamptz not null default now()
);

create index subscriber_purchases_user_id_idx on public.subscriber_purchases(user_id);

alter table public.subscriber_purchases enable row level security;

create policy "No direct client access to purchases"
  on public.subscriber_purchases for all
  using (false);

-- Track trial start per wedding
alter table public.weddings
  add column trial_started_at timestamptz;

-- Backfill existing weddings with trial start = created_at
update public.weddings set trial_started_at = created_at where trial_started_at is null;
