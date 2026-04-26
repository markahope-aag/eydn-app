-- Drop the Places Seed pipeline.
--
-- The scraper-import path now covers Google Places (and more sources) with
-- the same quality gates that the seeder bypassed. Keeping a parallel intake
-- with no quality rules was leaking low-quality vendors into the directory.
--
-- The corresponding admin UI tab, cron, library, and API routes have all
-- been removed in the same commit. These tables become orphans on deploy.
--
-- Pre-existing rows already imported via Places will keep their
-- `seed_source = 'places_api'` value on suggested_vendors — that column is
-- still in use by the scraper path. Only the seeder's bookkeeping tables go.

DROP TABLE IF EXISTS public.places_seed_configs;
DROP TABLE IF EXISTS public.places_api_usage_log;
