-- Blog posts table for "The Playbook" SEO blog
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_image text,
  category text not null default 'planning',
  tags text[] not null default '{}',
  author_name text not null default 'Eydn Team',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  read_time_minutes int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for public listing queries
create index if not exists idx_blog_posts_status_published on blog_posts (status, published_at desc)
  where status = 'published';
create index if not exists idx_blog_posts_slug on blog_posts (slug);
create index if not exists idx_blog_posts_category on blog_posts (category);

-- RLS: public can read published posts, admin can manage all
alter table blog_posts enable row level security;

create policy "Public can read published posts"
  on blog_posts for select
  using (status = 'published');

create policy "Service role full access to blog_posts"
  on blog_posts for all
  using (true)
  with check (true);

-- Updated_at trigger
create or replace function update_blog_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function update_blog_posts_updated_at();
