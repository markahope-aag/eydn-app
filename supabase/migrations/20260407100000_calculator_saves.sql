create table if not exists public.calculator_saves (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  email text not null,
  budget integer not null,
  guests integer not null,
  state text not null,
  month integer not null,
  created_at timestamptz default now()
);

create index idx_calculator_saves_short_code on public.calculator_saves (short_code);
create index idx_calculator_saves_email on public.calculator_saves (email);

alter table public.calculator_saves enable row level security;

create policy "Anyone can read by short code"
  on public.calculator_saves for select
  using (true);

create policy "Anyone can insert"
  on public.calculator_saves for insert
  with check (true);
