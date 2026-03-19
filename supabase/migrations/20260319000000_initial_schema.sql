-- Weddings
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  partner1_name text not null,
  partner2_name text not null,
  date date,
  venue text,
  budget numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index weddings_user_id_idx on public.weddings(user_id);

-- Guests
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  email text,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'accepted', 'declined')),
  meal_preference text,
  plus_one boolean not null default false,
  table_number integer,
  created_at timestamptz not null default now()
);

create index guests_wedding_id_idx on public.guests(wedding_id);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  category text,
  created_at timestamptz not null default now()
);

create index tasks_wedding_id_idx on public.tasks(wedding_id);

-- Row Level Security
alter table public.weddings enable row level security;
alter table public.guests enable row level security;
alter table public.tasks enable row level security;

-- Policies (using service role key from server, so these are for direct client access)
create policy "Users can manage their own weddings"
  on public.weddings for all
  using (user_id = current_setting('request.jwt.claim.sub', true))
  with check (user_id = current_setting('request.jwt.claim.sub', true));

create policy "Users can manage guests for their weddings"
  on public.guests for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

create policy "Users can manage tasks for their weddings"
  on public.tasks for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
