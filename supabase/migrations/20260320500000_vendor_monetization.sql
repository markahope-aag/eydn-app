-- Vendor accounts (vendors sign up separately from wedding subscribers)
create table public.vendor_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  business_name text not null,
  category text not null,
  description text,
  website text,
  phone text,
  email text not null,
  address text,
  city text not null,
  state text not null,
  zip text,
  logo_url text,
  price_range text check (price_range in ('$', '$$', '$$$', '$$$$')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendor_accounts_user_id_idx on public.vendor_accounts(user_id);
create index vendor_accounts_category_idx on public.vendor_accounts(category);
create index vendor_accounts_city_state_idx on public.vendor_accounts(city, state);

alter table public.vendor_accounts enable row level security;

create policy "No direct client access to vendor accounts"
  on public.vendor_accounts for all
  using (false);

-- Placement tiers and pricing (admin-managed)
create table public.placement_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price_monthly numeric(10,2) not null,
  price_quarterly numeric(10,2) not null,
  price_annual numeric(10,2) not null,
  features jsonb not null default '[]',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.placement_tiers enable row level security;

create policy "Anyone can read active placement tiers"
  on public.placement_tiers for select
  using (active = true);

create policy "No direct writes to placement tiers"
  on public.placement_tiers for insert
  with check (false);

create policy "No direct updates to placement tiers"
  on public.placement_tiers for update
  using (false)
  with check (false);

-- Insert default tiers
insert into public.placement_tiers (name, description, price_monthly, price_quarterly, price_annual, features, sort_order) values
  ('Basic', 'Free listing in the vendor directory', 0, 0, 0, '["Directory listing", "Business profile", "Contact info"]'::jsonb, 0),
  ('Featured', 'Priority placement in search results', 49.99, 129.99, 449.99, '["Everything in Basic", "Priority in search results", "Featured badge", "Category spotlight"]'::jsonb, 1),
  ('Premium', 'Maximum visibility and lead generation', 99.99, 269.99, 899.99, '["Everything in Featured", "Top of category pages", "Homepage spotlight", "Lead notifications", "Analytics dashboard"]'::jsonb, 2);

-- Active placements (purchased by vendors)
create table public.vendor_placements (
  id uuid primary key default gen_random_uuid(),
  vendor_account_id uuid not null references public.vendor_accounts(id) on delete cascade,
  tier_id uuid not null references public.placement_tiers(id),
  billing_period text not null check (billing_period in ('monthly', 'quarterly', 'annual')),
  amount_paid numeric(10,2) not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  auto_renew boolean not null default true,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'past_due')),
  geographic_target jsonb,
  created_at timestamptz not null default now()
);

create index vendor_placements_vendor_id_idx on public.vendor_placements(vendor_account_id);
create index vendor_placements_status_idx on public.vendor_placements(status) where status = 'active';
create index vendor_placements_expires_idx on public.vendor_placements(expires_at);

alter table public.vendor_placements enable row level security;

create policy "No direct client access to vendor placements"
  on public.vendor_placements for all
  using (false);

-- Vendor analytics (impressions, clicks, leads)
create table public.vendor_analytics (
  id uuid primary key default gen_random_uuid(),
  vendor_account_id uuid not null references public.vendor_accounts(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'lead', 'contact')),
  wedding_id uuid references public.weddings(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index vendor_analytics_vendor_id_idx on public.vendor_analytics(vendor_account_id);
create index vendor_analytics_created_idx on public.vendor_analytics(created_at);

alter table public.vendor_analytics enable row level security;

create policy "No direct client access to vendor analytics"
  on public.vendor_analytics for all
  using (false);

-- Extend suggested_vendors with placement fields
alter table public.suggested_vendors
  add column vendor_account_id uuid references public.vendor_accounts(id) on delete set null,
  add column placement_tier text,
  add column placement_expires_at timestamptz;

-- Add vendor role to user_roles
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('user', 'admin', 'vendor'));
