-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create index user_roles_user_id_idx on public.user_roles(user_id);

-- App settings (singleton key-value store)
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Insert default settings
insert into public.app_settings (key, value) values
  ('registration', '{"enabled": true, "invite_only": false}'::jsonb),
  ('features', '{"ai_chat": true, "seating_chart": true, "day_of_planner": true, "file_uploads": true}'::jsonb),
  ('limits', '{"max_guests": 500, "max_chat_messages_per_hour": 30, "max_file_size_mb": 10}'::jsonb);

-- RLS - admin tables use service role only (no client access)
alter table public.user_roles enable row level security;
alter table public.app_settings enable row level security;
