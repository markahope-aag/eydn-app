-- Vendor sourcing pipeline: seed the directory from Google Places API.
--
-- Two new tables and four new columns on suggested_vendors. After this
-- migration, suggested_vendors becomes the single source of truth for the
-- couple-facing directory, with rows arriving from any of:
--   - 'places_api'  : seeded by the cron from Google Places (this migration)
--   - 'csv'         : bulk-uploaded by an admin
--   - 'manual'      : admin entered via the directory CRUD form
--   - 'submission'  : auto-promoted from an approved vendor_submission

-- Categories × cities the seeder cron should populate. One row per
-- (category, city, state) target. The cron picks up rows where
-- enabled = true and next_run_at IS NULL OR next_run_at <= now().
CREATE TABLE IF NOT EXISTS public.places_seed_configs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category          text NOT NULL,
  city              text NOT NULL,
  state             text NOT NULL,
  country           text NOT NULL DEFAULT 'US',
  -- Cap on results per run. Places returns 20 per page; 60 = 3 pages,
  -- which is the practical max from a single textSearch query.
  max_results       int  NOT NULL DEFAULT 20 CHECK (max_results > 0 AND max_results <= 60),
  enabled           boolean NOT NULL DEFAULT true,
  -- Stamped by the cron after each run.
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  last_result_count int,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Prevent accidental dupes.
  UNIQUE (category, city, state)
);

CREATE INDEX IF NOT EXISTS idx_places_seed_configs_due
  ON public.places_seed_configs (next_run_at NULLS FIRST)
  WHERE enabled = true;

-- Per-call usage log so the cost cap can enforce a daily limit without
-- guessing. cost_units is dimensionless — the runner picks values that
-- approximate Google's pricing tiers (textSearch ≈ 8, place_details ≈ 4)
-- and the cap is enforced as `SUM(cost_units) today < cap`.
CREATE TABLE IF NOT EXISTS public.places_api_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    text NOT NULL,
  cost_units  int  NOT NULL DEFAULT 1,
  called_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_places_api_usage_log_called_at
  ON public.places_api_usage_log (called_at);

-- Old usage rows aren't useful — keep 30 days for spot-checking. Operators
-- can run this manually; we don't bother automating cleanup yet.
COMMENT ON TABLE public.places_api_usage_log IS
  'Per-call audit + daily cap source of truth. Truncate older than 30 days when convenient.';

-- suggested_vendors gets four new columns to support GMB-sourced rows.
-- gmb_place_id is the canonical dedup key (Google's stable place ID).
-- Existing rows have NULL place_id and remain unchanged; the cron will
-- backfill place_id when it encounters a row whose name+city+state matches.
ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS gmb_place_id          text,
  ADD COLUMN IF NOT EXISTS gmb_data              jsonb,
  ADD COLUMN IF NOT EXISTS gmb_last_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seed_source           text;

-- Unique on place_id (allowing NULLs — many existing rows don't have one).
CREATE UNIQUE INDEX IF NOT EXISTS uq_suggested_vendors_gmb_place_id
  ON public.suggested_vendors (gmb_place_id)
  WHERE gmb_place_id IS NOT NULL;

-- RLS — service role only (admin API is the only writer; couple-facing
-- read goes through the existing /api/suggested-vendors route which uses
-- createSupabaseAdmin under the hood).
ALTER TABLE public.places_seed_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_api_usage_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.places_seed_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.places_api_usage_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at trigger for places_seed_configs (touch_updated_at already
-- exists from the email-engine migration).
DROP TRIGGER IF EXISTS places_seed_configs_updated_at ON public.places_seed_configs;
CREATE TRIGGER places_seed_configs_updated_at
  BEFORE UPDATE ON public.places_seed_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
