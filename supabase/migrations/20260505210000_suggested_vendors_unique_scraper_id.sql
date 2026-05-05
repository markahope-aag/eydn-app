-- Unique constraint on scraper_id so that scraper-import.ts can use
-- upsert(onConflict: 'scraper_id', ignoreDuplicates: true) to absorb
-- race conditions between webhook + cron firing concurrently.
--
-- Manually-created suggested_vendors have scraper_id = NULL. A regular
-- UNIQUE constraint allows multiple NULLs (NULL != NULL by default in
-- Postgres), so this doesn't conflict with existing manual rows.
--
-- A partial unique index (WHERE scraper_id IS NOT NULL) does NOT
-- satisfy inferred ON CONFLICT (scraper_id) — Postgres requires the
-- INSERT to carry a matching predicate, which supabase-js doesn't
-- emit. So a regular non-partial unique index is required.
--
-- Without this constraint, every scraper import has been failing with:
--   "db insert failed: there is no unique or exclusion constraint
--    matching the ON CONFLICT specification"

create unique index if not exists suggested_vendors_scraper_id_unique
  on public.suggested_vendors (scraper_id);
