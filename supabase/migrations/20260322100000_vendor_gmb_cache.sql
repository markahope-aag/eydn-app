-- Cache Google Places data for vendors to avoid repeated API calls
ALTER TABLE public.vendors
  ADD COLUMN gmb_place_id TEXT,
  ADD COLUMN gmb_data JSONB,
  ADD COLUMN gmb_fetched_at TIMESTAMPTZ;

-- Index for quick lookup
CREATE INDEX idx_vendors_gmb ON public.vendors(gmb_place_id) WHERE gmb_place_id IS NOT NULL;
