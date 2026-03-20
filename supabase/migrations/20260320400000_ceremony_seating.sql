-- Ceremony positions (altar, seating rows)
create table public.ceremony_positions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  person_type text not null check (person_type in ('wedding_party', 'officiant', 'couple')),
  person_id uuid,
  person_name text not null,
  role text,
  side text check (side in ('left', 'right', 'center')),
  position_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index ceremony_positions_wedding_id_idx on public.ceremony_positions(wedding_id);

alter table public.ceremony_positions enable row level security;

create policy "Users can manage ceremony positions for their weddings"
  on public.ceremony_positions for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
