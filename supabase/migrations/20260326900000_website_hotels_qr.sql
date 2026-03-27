-- Structured hotel/accommodation entries for wedding website
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS website_hotels jsonb DEFAULT '[]';

-- Cache QR code URLs on RSVP tokens to avoid re-generating
ALTER TABLE rsvp_tokens
  ADD COLUMN IF NOT EXISTS qr_code_url text;
