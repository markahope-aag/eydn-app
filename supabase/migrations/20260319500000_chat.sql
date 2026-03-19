-- Chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_wedding_id_idx on public.chat_messages(wedding_id);

alter table public.chat_messages enable row level security;

create policy "Users can manage chat messages for their weddings"
  on public.chat_messages for all
  using (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)))
  with check (wedding_id in (select id from public.weddings where user_id = current_setting('request.jwt.claim.sub', true)));
