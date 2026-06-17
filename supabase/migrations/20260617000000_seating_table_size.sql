-- Resizable reception tables.
--
-- Tables previously rendered at a fixed footprint (round 140px, rectangle
-- 200x90) regardless of seat count, so a 2-seat sweetheart table looked the
-- same size as a 12-seat head table. Store an explicit width/height so couples
-- can size each table independently — the same drag-to-resize behaviour the
-- floor-plan "areas" already have.
--
-- Nullable on purpose: existing tables keep NULL and the UI falls back to the
-- shape defaults, so this is backward-compatible with already-deployed code
-- (which never reads or writes these columns).
ALTER TABLE public.seating_tables
  ADD COLUMN width  double precision,
  ADD COLUMN height double precision;

ALTER TABLE public.seating_tables
  ADD CONSTRAINT seating_tables_width_positive  CHECK (width  IS NULL OR width  > 0),
  ADD CONSTRAINT seating_tables_height_positive CHECK (height IS NULL OR height > 0);
