-- Auto-featured rule: top 10% of active vendors per category by quality_score
-- are automatically marked featured. Admin can lock a row's featured value
-- so the rule won't touch it (forced-in, forced-out, or sponsorship rows).

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS featured_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.suggested_vendors.featured_locked IS
  'When true, applyFeaturedRule() in src/lib/vendors/featured.ts will not touch the featured column. Admin sets via the Vendor Edit Modal.';

-- Helps the rule''s per-category ranking query.
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_category_score
  ON public.suggested_vendors (category, quality_score DESC NULLS LAST)
  WHERE active = true AND featured_locked = false;
