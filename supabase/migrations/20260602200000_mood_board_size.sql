-- Per-tile size for the Vision Board grid (small / medium / large spans), so
-- couples can resize images on the board. sort_order already exists for
-- drag-to-reorder.
alter table public.mood_board_items
  add column if not exists size text not null default 'small';
