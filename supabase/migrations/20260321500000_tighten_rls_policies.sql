-- Tighten vendor_submissions INSERT policy: require authenticated user
DROP POLICY "Users can submit vendors" ON public.vendor_submissions;
CREATE POLICY "Authenticated users can submit vendors"
  ON public.vendor_submissions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Tighten wedding_photos INSERT policy: require the wedding to exist
DROP POLICY "Anyone can insert photos" ON public.wedding_photos;
CREATE POLICY "Insert photos for existing weddings"
  ON public.wedding_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weddings
      WHERE id = wedding_id AND website_enabled = true
    )
  );
