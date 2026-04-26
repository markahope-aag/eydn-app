-- Stash scraper-only fields (social handles, hours, business status, coords)
-- without conflating with gmb_data, which is reserved for live Google Places
-- enrichment fetched on-demand by /api/suggested-vendors/[id]/gmb.
--
-- Shape (set by scraper-import.ts):
--   { instagram, facebook, pinterest, business_status, hours, lat, lng,
--     market, description_status, _review_count }

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS scraper_extras jsonb;

COMMENT ON COLUMN public.suggested_vendors.scraper_extras IS
  'Extra fields from the scraper that have no first-class column: social URLs, hours, business_status, coords, description_status, review count. Admin-only audit data; not exposed in the couple-facing API.';
