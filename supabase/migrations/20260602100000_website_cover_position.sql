-- Focal point for the wedding-website cover image, stored as a CSS
-- object-position value (e.g. '50% 30%'). Lets couples control which part of a
-- vertical/tall cover photo stays visible instead of always centering.
alter table public.weddings
  add column if not exists website_cover_position text not null default '50% 50%';
