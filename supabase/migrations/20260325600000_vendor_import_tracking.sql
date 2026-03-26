-- Track when vendor data was imported and from where, so admins
-- can monitor staleness and know when to re-pull.

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS import_source TEXT;

-- Index for quickly finding stale imports
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_imported_at
  ON public.suggested_vendors(imported_at)
  WHERE imported_at IS NOT NULL;

COMMENT ON COLUMN public.suggested_vendors.imported_at IS 'When this record was bulk-imported. NULL = manually added.';
COMMENT ON COLUMN public.suggested_vendors.import_source IS 'Identifier for the source (e.g. remote Supabase project URL). NULL = manually added.';
