-- Schema for the automated scraper-to-Eydn import pipeline.
--
-- The hourly cron at /api/cron/import-vendors pulls new vendor rows from
-- the external scraper's Supabase, normalizes them, applies Eydn's quality
-- rules (src/lib/vendors/quality.ts), then either inserts qualifying rows
-- into suggested_vendors OR logs them to vendor_import_rejections.
--
-- Idempotency: every successfully-imported row carries the scraper's row id
-- as `scraper_id`; the cron skips any scraper row whose id already lives in
-- either suggested_vendors.scraper_id or vendor_import_rejections.scraper_id.
-- Result: re-running the cron is a safe no-op for already-seen vendors.

ALTER TABLE public.suggested_vendors
  -- Stable origin key from the scraper's vendors.id. Lets the cron dedup
  -- without time-based watermarks (which would re-process if scraper rows
  -- got their created_at refreshed).
  ADD COLUMN IF NOT EXISTS scraper_id text,
  -- Set true when an admin manually approves a vendor that failed quality
  -- rules (via the rejections override flow). The quality check honors this
  -- flag so future re-runs don't re-reject the same row.
  ADD COLUMN IF NOT EXISTS manually_approved boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_suggested_vendors_scraper_id
  ON public.suggested_vendors (scraper_id)
  WHERE scraper_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vendor_import_rejections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_id    text NOT NULL UNIQUE,
  -- Raw row from the scraper at the moment of rejection. Lets admins inspect
  -- what came in and decide whether to override (vs. having to re-fetch).
  scraper_data  jsonb NOT NULL,
  failed_rules  text[] NOT NULL,
  rejected_at   timestamptz NOT NULL DEFAULT now(),
  -- Set when an admin approves an originally-rejected row through the
  -- override flow. Kept for audit so we can see which manual decisions
  -- led to which suggested_vendors rows.
  overridden_at timestamptz,
  overridden_by text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_import_rejections_rejected_at
  ON public.vendor_import_rejections (rejected_at DESC);

ALTER TABLE public.vendor_import_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.vendor_import_rejections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON COLUMN public.suggested_vendors.scraper_id IS
  'Origin row ID from the external scraper. Cron uses this to dedup re-runs.';
COMMENT ON COLUMN public.suggested_vendors.manually_approved IS
  'True when an admin overrode a quality-rule rejection. Quality checker honors this so re-imports do not re-reject.';
COMMENT ON TABLE public.vendor_import_rejections IS
  'Vendors the auto-import cron filtered out for failing quality rules. Admins can review + override individual rows.';
