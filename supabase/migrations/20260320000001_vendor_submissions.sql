-- Vendor submissions from users for admin review
create table public.vendor_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by text not null,
  name text not null,
  category text not null,
  website text,
  phone text,
  email text,
  city text,
  state text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index vendor_submissions_status_idx on public.vendor_submissions(status);

alter table public.vendor_submissions enable row level security;

-- Users can submit but not read others' submissions
create policy "Users can submit vendors"
  on public.vendor_submissions for insert
  with check (true);

create policy "No direct reads of submissions"
  on public.vendor_submissions for select
  using (false);
