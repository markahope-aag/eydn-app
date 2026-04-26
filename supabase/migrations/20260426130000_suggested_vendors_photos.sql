-- First-class photos array on suggested_vendors. Couple-facing — surfaced
-- in the directory card + detail panel as a gallery.
--
-- Each entry is either:
--   - A direct URL (rendered as-is)
--   - A Google Places photo "name" like places/PLACE_ID/photos/PHOTO_REF
--     (rendered via the existing /api/places-photo?ref=... proxy so the
--     API key never reaches the browser)
--
-- The frontend detects which format it has and routes accordingly.

ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.suggested_vendors.photos IS
  'Photo URLs OR Google Places photo names (places/PID/photos/PREF). Couple-facing — included in the public API. Frontend renders both formats.';
