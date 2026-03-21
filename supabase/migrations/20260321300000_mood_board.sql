-- Mood board for wedding inspiration
CREATE TABLE mood_board_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_board_items_wedding ON mood_board_items(wedding_id);
CREATE INDEX idx_mood_board_items_category ON mood_board_items(wedding_id, category);
