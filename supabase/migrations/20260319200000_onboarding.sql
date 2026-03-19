-- Questionnaire responses
create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  responses jsonb not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questionnaire_responses enable row level security;

create policy "Users can manage their questionnaire responses"
  on public.questionnaire_responses for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));

-- Extend weddings table
alter table public.weddings
  add column guest_count_estimate integer,
  add column style_description text,
  add column has_wedding_party boolean,
  add column wedding_party_count integer,
  add column has_pre_wedding_events boolean,
  add column has_honeymoon boolean;

-- Extend tasks table
alter table public.tasks
  add column edyn_message text,
  add column sort_order integer,
  add column timeline_phase text,
  add column is_system_generated boolean not null default false,
  add column parent_task_id uuid references public.tasks(id) on delete cascade,
  add column notes text;
