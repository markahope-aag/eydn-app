-- Link mood board items to vendors for inspiration-to-vendor tracking
ALTER TABLE mood_board_items
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id);
