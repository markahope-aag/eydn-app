-- Add host, dress code, and capacity fields to rehearsal dinner
ALTER TABLE rehearsal_dinner
  ADD COLUMN IF NOT EXISTS hosted_by text,
  ADD COLUMN IF NOT EXISTS dress_code text,
  ADD COLUMN IF NOT EXISTS capacity integer;
