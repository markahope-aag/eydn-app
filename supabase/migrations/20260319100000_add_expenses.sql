-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  category text not null,
  paid boolean not null default false,
  vendor_id uuid,
  created_at timestamptz not null default now()
);

create index expenses_wedding_id_idx on public.expenses(wedding_id);

-- Row Level Security
alter table public.expenses enable row level security;

create policy "Users can manage expenses for their weddings"
  on public.expenses for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
