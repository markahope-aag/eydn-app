-- Add address fields to wedding_party for gift shipping, attire delivery, etc.
ALTER TABLE wedding_party
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text;

-- Add shared attire note to weddings (e.g. "All bridesmaids: Dusty Rose floor-length dress")
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS shared_attire_note text;
