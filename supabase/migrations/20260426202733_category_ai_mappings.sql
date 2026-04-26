-- Cache AI categorization decisions per raw category string.
--
-- The scraper-import pipeline normalizes each row's raw `category` value
-- through src/lib/vendors/normalize.ts. Static aliases handle the common
-- cases. When a string isn't in the alias map, we ask Claude Haiku to
-- pick the best canonical bucket and persist the result here so the same
-- raw string never costs another API call.
--
-- raw_category is lowercased before lookup/insert (PK ensures uniqueness).
-- mapped_category may be NULL when the AI judged the input as not a
-- wedding vendor at all — those rows still get rejected, the cache just
-- prevents re-asking.
--
-- override_category lets an admin force a different mapping than what AI
-- chose, without retraining anything. When set, callers must use it
-- instead of mapped_category.

CREATE TABLE IF NOT EXISTS public.category_ai_mappings (
  raw_category       text PRIMARY KEY,
  mapped_category    text,                  -- canonical VENDOR_CATEGORIES value, or NULL = "not a wedding vendor"
  confidence         numeric(3,2),          -- 0.00 - 1.00
  reasoning          text,                  -- AI's one-sentence explanation, for audit
  ai_model           text NOT NULL,         -- e.g. "claude-haiku-4-5-20251001"
  override_category  text,                  -- admin override, takes precedence over mapped_category
  override_set_by    text,                  -- clerk userId that set the override
  override_set_at    timestamptz,
  hit_count          integer NOT NULL DEFAULT 1,  -- how many import rows used this mapping
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_ai_mappings_recent
  ON public.category_ai_mappings (created_at DESC);

COMMENT ON TABLE public.category_ai_mappings IS
  'Cache of AI-assigned vendor category mappings. Keyed on the lowercased raw scraper string. mapped_category=NULL means AI judged the input as not a wedding vendor.';
COMMENT ON COLUMN public.category_ai_mappings.override_category IS
  'When set, this value takes precedence over mapped_category. Lets admins fix bad AI calls without re-training or re-asking.';

ALTER TABLE public.category_ai_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.category_ai_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS category_ai_mappings_updated_at ON public.category_ai_mappings;
CREATE TRIGGER category_ai_mappings_updated_at
  BEFORE UPDATE ON public.category_ai_mappings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
