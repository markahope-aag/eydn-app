-- Optional "Quick Start" walk-through for new couples. When false (default),
-- the dashboard shows a simplified getting-started view until the couple either
-- completes the setup steps or opts out into the full dashboard.
alter table public.weddings
  add column if not exists quickstart_dismissed boolean not null default false;
