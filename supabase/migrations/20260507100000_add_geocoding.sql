-- Add lat/lng coordinates to weddings and suggested_vendors so the directory
-- can do real distance-based vendor relevance instead of the city-string
-- ILIKE that breaks at scale.
--
-- Geocoding source is application-level (Google Geocoding) — we store the
-- result here so we don't re-geocode on every request. A btree index on
-- (lat, lng) supports cheap bounding-box pre-filters; the haversine sort
-- runs on the small filtered set.

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geocoded_address text,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_suggested_vendors_latlng
  ON public.suggested_vendors (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Lightweight trigger: any time we wipe venue_city, also wipe the cached
-- coordinates so the next read sees a clean slate. (Population happens at
-- the application layer where we have the Google Geocoding API key.)
CREATE OR REPLACE FUNCTION public.clear_wedding_geocode_when_city_cleared()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.venue_city IS NULL OR NEW.venue_city = '' THEN
    IF OLD.venue_city IS NOT NULL AND OLD.venue_city <> '' THEN
      NEW.lat := NULL;
      NEW.lng := NULL;
      NEW.geocoded_address := NULL;
      NEW.geocoded_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_wedding_geocode ON public.weddings;
CREATE TRIGGER clear_wedding_geocode
BEFORE UPDATE OF venue_city ON public.weddings
FOR EACH ROW EXECUTE FUNCTION public.clear_wedding_geocode_when_city_cleared();
