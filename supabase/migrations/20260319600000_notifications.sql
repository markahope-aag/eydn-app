-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  task_id uuid references public.tasks(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  created_at timestamptz not null default now()
);

create index notifications_wedding_id_idx on public.notifications(wedding_id);

alter table public.notifications enable row level security;

create policy "Users can manage notifications for their weddings"
  on public.notifications for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Attachments
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'vendor')),
  entity_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  created_at timestamptz not null default now()
);

create index attachments_wedding_id_idx on public.attachments(wedding_id);

alter table public.attachments enable row level security;

create policy "Users can manage attachments for their weddings"
  on public.attachments for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Notification preferences
create table public.notification_preferences (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  email_reminders boolean not null default true,
  reminder_days_before integer not null default 7
);

alter table public.notification_preferences enable row level security;

create policy "Users can manage their notification preferences"
  on public.notification_preferences for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
