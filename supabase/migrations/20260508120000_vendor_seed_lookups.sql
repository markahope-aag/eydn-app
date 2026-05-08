-- vendor_seed_lookups: ledger of /api/vendors/places-search calls, used for
-- two purposes:
--   1. Per-user daily cap (20/day). Each cost-incurring lookup is logged;
--      cache hits are not. Free-tier callers are blocked at the route
--      level before logging.
--   2. 24h dedupe cache. Repeated lookups of the same name+location reuse
--      the previous result without spending another $0.052 on Google.
--
-- result='error' rows are logged for observability but don't count toward
-- the daily cap (we don't want to penalize users for our outages).

create table public.vendor_seed_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  query_name text not null,
  query_location text,
  -- Normalized "name|location" — repeated identical queries (any user) hit
  -- the cache and skip the API call.
  cache_key text not null,
  result text not null check (result in ('match','no_match','error')),
  place_id text,
  -- Full PlaceData payload from /api/vendors/places-search response, stored
  -- so cache hits can return immediately without any Google API call.
  place_data jsonb,
  created_at timestamptz not null default now()
);

create index vendor_seed_lookups_user_created_idx
  on public.vendor_seed_lookups (user_id, created_at desc);

create index vendor_seed_lookups_cache_key_created_idx
  on public.vendor_seed_lookups (cache_key, created_at desc);
