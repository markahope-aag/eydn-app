-- Add priority to tasks
alter table public.tasks
  add column priority text not null default 'medium' check (priority in ('high', 'medium', 'low'));

-- Add status field (replaces completed boolean)
alter table public.tasks
  add column status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done'));

-- Migrate existing completed boolean to status
update public.tasks set status = 'done' where completed = true;

-- Related tasks (many-to-many)
create table public.related_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  related_task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(task_id, related_task_id)
);

alter table public.related_tasks enable row level security;

create policy "Users can manage related tasks for their weddings"
  on public.related_tasks for all
  using (task_id in (
    select t.id from public.tasks t
    join public.weddings w on t.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ))
  with check (task_id in (
    select t.id from public.tasks t
    join public.weddings w on t.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ));

-- Task resources (links to external content)
create table public.task_resources (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.task_resources enable row level security;

create policy "Users can manage task resources for their weddings"
  on public.task_resources for all
  using (task_id in (
    select t.id from public.tasks t
    join public.weddings w on t.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ))
  with check (task_id in (
    select t.id from public.tasks t
    join public.weddings w on t.wedding_id = w.id
    where w.user_id = current_setting('request.jwt.claim.sub', true)
  ));
