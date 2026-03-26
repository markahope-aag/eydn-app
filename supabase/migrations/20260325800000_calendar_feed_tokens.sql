-- Calendar feed tokens: allow unauthenticated calendar apps to fetch task feeds
create table public.calendar_feed_tokens (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- One active token per wedding
create unique index calendar_feed_tokens_active_wedding
  on public.calendar_feed_tokens(wedding_id) where revoked_at is null;

-- Fast lookup by token
create index calendar_feed_tokens_token_idx
  on public.calendar_feed_tokens(token) where revoked_at is null;

alter table public.calendar_feed_tokens enable row level security;

-- Only accessible via service role (API routes use createSupabaseAdmin)
create policy "calendar_feed_tokens_service_only"
  on public.calendar_feed_tokens
  for all
  using (false);

comment on table public.calendar_feed_tokens is
  'Secret tokens for unauthenticated calendar feed access (webcal:// subscriptions)';
