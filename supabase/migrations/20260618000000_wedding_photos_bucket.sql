-- Guest photo uploads from the public wedding website are written to the
-- `wedding-photos` storage bucket by /api/public/photos. That bucket was never
-- created in production, so every "Upload Photo" attempt failed with a generic
-- "Upload failed" (the storage target didn't exist). Create it here.
--
-- Public so the couple's Gallery tab and the public site can serve photos via
-- getPublicUrl. Uploads run through the service-role admin route, which
-- bypasses storage RLS, so no INSERT policy is required; public read is granted
-- by the bucket's `public` flag. File-size and MIME limits mirror the app's
-- UPLOAD config (src/lib/config.ts) as defense in depth.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-photos',
  'wedding-photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;
