-- Add couple photo URL to weddings for the public wedding website
ALTER TABLE public.weddings
  ADD COLUMN website_couple_photo_url TEXT;
