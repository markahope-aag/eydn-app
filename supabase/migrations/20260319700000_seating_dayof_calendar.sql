-- Seating tables
create table public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  table_number integer not null,
  name text,
  x double precision not null default 0,
  y double precision not null default 0,
  shape text not null default 'round' check (shape in ('round', 'rectangle')),
  capacity integer not null default 8
);

create index seating_tables_wedding_id_idx on public.seating_tables(wedding_id);

alter table public.seating_tables enable row level security;

create policy "Users can manage seating tables for their weddings"
  on public.seating_tables for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Seat assignments
create table public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  seating_table_id uuid not null references public.seating_tables(id) on delete cascade,
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  seat_number integer
);

alter table public.seat_assignments enable row level security;

create policy "Users can manage seat assignments"
  on public.seat_assignments for all
  using (seating_table_id in (
    select st.id from public.seating_tables st
    join public.weddings w on st.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ))
  with check (seating_table_id in (
    select st.id from public.seating_tables st
    join public.weddings w on st.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ));

-- Day-of plans
create table public.day_of_plans (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  content jsonb not null default '{}',
  generated_at timestamptz,
  edited_at timestamptz
);

alter table public.day_of_plans enable row level security;

create policy "Users can manage their day-of plans"
  on public.day_of_plans for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
