-- Platform-managed suggested vendor directory
create table public.suggested_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  website text,
  phone text,
  email text,
  address text,
  city text not null,
  state text not null,
  zip text,
  country text not null default 'US',
  price_range text check (price_range in ('$', '$$', '$$$', '$$$$')),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suggested_vendors_category_idx on public.suggested_vendors(category);
create index suggested_vendors_city_state_idx on public.suggested_vendors(city, state);
create index suggested_vendors_active_idx on public.suggested_vendors(active) where active = true;

-- RLS: readable by all authenticated users, writable only via service role (admin)
alter table public.suggested_vendors enable row level security;

create policy "Anyone can read active suggested vendors"
  on public.suggested_vendors for select
  using (active = true);

create policy "No direct writes to suggested vendors"
  on public.suggested_vendors for insert
  with check (false);

create policy "No direct updates to suggested vendors"
  on public.suggested_vendors for update
  using (false)
  with check (false);

create policy "No direct deletes to suggested vendors"
  on public.suggested_vendors for delete
  using (false);
