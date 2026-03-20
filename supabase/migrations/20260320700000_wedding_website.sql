-- Wedding website settings
alter table public.weddings
  add column website_slug text unique,
  add column website_enabled boolean not null default false,
  add column website_headline text,
  add column website_story text,
  add column website_cover_url text,
  add column website_schedule jsonb default '[]',
  add column website_travel_info text,
  add column website_accommodations text,
  add column website_faq jsonb default '[]';

create index weddings_website_slug_idx on public.weddings(website_slug) where website_slug is not null;

-- Registry links
create table public.registry_links (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index registry_links_wedding_id_idx on public.registry_links(wedding_id);

alter table public.registry_links enable row level security;

create policy "Users can manage their registry links"
  on public.registry_links for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Photo gallery
create table public.wedding_photos (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  uploaded_by text not null,
  uploader_name text,
  file_url text not null,
  caption text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index wedding_photos_wedding_id_idx on public.wedding_photos(wedding_id);

alter table public.wedding_photos enable row level security;

-- Anyone can view approved photos for a public wedding, only owners can manage
create policy "Photos are readable on public weddings"
  on public.wedding_photos for select
  using (approved = true);

create policy "Anyone can insert photos"
  on public.wedding_photos for insert
  with check (true);

create policy "No direct updates to photos"
  on public.wedding_photos for update
  using (false)
  with check (false);

-- Guest RSVP tokens (for unique RSVP links)
create table public.rsvp_tokens (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  responded boolean not null default false,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index rsvp_tokens_token_idx on public.rsvp_tokens(token);
create index rsvp_tokens_wedding_id_idx on public.rsvp_tokens(wedding_id);

alter table public.rsvp_tokens enable row level security;

-- Tokens are readable by anyone with the token (checked in API)
create policy "RSVP tokens readable"
  on public.rsvp_tokens for select
  using (true);

create policy "No direct writes to rsvp tokens"
  on public.rsvp_tokens for insert
  with check (false);

create policy "No direct updates to rsvp tokens"
  on public.rsvp_tokens for update
  using (false)
  with check (false);
