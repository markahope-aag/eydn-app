-- Floor-plan objects: labelled boxes (dance floor, sweetheart table,
-- food table, etc.) couples place and resize on the seating chart canvas
-- alongside their reception tables.

create table public.floor_plan_objects (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null default 'New area',
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 180,
  height numeric not null default 110,
  created_at timestamptz not null default now()
);

create index floor_plan_objects_wedding_id_idx on public.floor_plan_objects(wedding_id);

alter table public.floor_plan_objects enable row level security;

create policy "Users can manage floor plan objects for their weddings"
  on public.floor_plan_objects for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
