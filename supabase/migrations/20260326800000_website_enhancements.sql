-- Wedding website enhancements for RSVP, gallery, and meal options
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS rsvp_deadline text,
  ADD COLUMN IF NOT EXISTS photo_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meal_options jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS website_theme jsonb DEFAULT '{}';
