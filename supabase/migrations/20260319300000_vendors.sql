-- Vendors
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  category text not null,
  name text not null,
  status text not null default 'searching' check (status in ('searching', 'contacted', 'quote_received', 'booked', 'deposit_paid', 'paid_in_full')),
  poc_name text,
  poc_email text,
  poc_phone text,
  notes text,
  amount numeric(12,2),
  amount_paid numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_wedding_id_idx on public.vendors(wedding_id);

alter table public.vendors enable row level security;

create policy "Users can manage vendors for their weddings"
  on public.vendors for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Add FK constraint on expenses.vendor_id
alter table public.expenses
  add constraint expenses_vendor_id_fkey
  foreign key (vendor_id) references public.vendors(id) on delete set null;
