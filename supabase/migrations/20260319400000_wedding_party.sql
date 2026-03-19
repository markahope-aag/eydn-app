-- Wedding Party
create table public.wedding_party (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  phone text,
  job_assignment text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index wedding_party_wedding_id_idx on public.wedding_party(wedding_id);

alter table public.wedding_party enable row level security;

create policy "Users can manage their wedding party"
  on public.wedding_party for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Extend guests
alter table public.guests
  add column plus_one_name text,
  add column address text,
  add column phone text,
  add column group_name text;
