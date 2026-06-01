-- Email image library: admin-managed images for use in email templates.

-- Public storage bucket so uploaded images can be hotlinked directly from
-- outbound emails (email clients can only render publicly reachable URLs).
insert into storage.buckets (id, name, public)
values ('email-images', 'email-images', true)
on conflict (id) do nothing;

-- Metadata for each uploaded email image. The binary lives in storage; this
-- table tracks the alt text, dimensions, and size the library UI displays.
create table if not exists public.email_images (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  alt_text text not null default '',
  width integer,
  height integer,
  byte_size integer,
  content_type text,
  created_by text,
  created_at timestamptz not null default now()
);

-- Admin-only. Every access path goes through the service-role admin API
-- routes, which bypass RLS. Enabling RLS with no policies denies any direct
-- client (anon/authenticated) access to the table.
alter table public.email_images enable row level security;

create index email_images_created_at_idx on public.email_images (created_at desc);
