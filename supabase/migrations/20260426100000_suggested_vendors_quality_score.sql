-- Internal vendor quality score, surfaced in the admin Directory but never
-- exposed to couples. Sourced from the external vendor data pipeline (the
-- importer maps the remote `score` column to this), or set/edited by hand
-- in the admin edit modal.
--
-- NUMERIC(5,2) supports any common scoring scheme: 0–100 (e.g. 87.4),
-- 0–10 (8.7), or 0–1 (0.85). No CHECK so the column adapts to whatever
-- weights the upstream pipeline produces.

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2);

COMMENT ON COLUMN public.suggested_vendors.quality_score IS
  'Admin-only ranking signal sourced from the external vendor data pipeline. '
  'NEVER include in couple-facing API responses (see /api/suggested-vendors).';

-- Partial index for admin sorts (most common: score-desc, ignoring nulls).
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_quality_score
  ON public.suggested_vendors (quality_score DESC NULLS LAST)
  WHERE quality_score IS NOT NULL;
