-- Widen suggested_vendors.photos from text[] to jsonb to match the scraper
-- team's shipped photo schema. The scraper now writes an ordered array of
-- objects, where index 0 is the hero:
--
--   [
--     {
--       "url": "https://.../vendor-photos/<vendor_id>/0.jpg",
--       "source": "google_places",
--       "width": 1200, "height": 800,
--       "attribution": "Photo by Jane Doe via Google",
--       "fetched_at": "2026-04-26T22:30:00.000Z"
--     },
--     ...
--   ]
--
-- The previous text[] column was added on spec but never populated (verified
-- 0 rows have data) so we drop and recreate as jsonb without a backfill.
-- Default '[]' so existing rows treat the column as "no photos" naturally.

ALTER TABLE public.suggested_vendors DROP COLUMN IF EXISTS photos;
ALTER TABLE public.suggested_vendors ADD COLUMN photos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.suggested_vendors.photos IS
  'Ordered array of {url, source, width, height, attribution, fetched_at} from the scraper. Index 0 is the hero. Public CDN URLs, no proxy needed.';
