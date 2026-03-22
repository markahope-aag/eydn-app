-- Comments for collaborative wedding planning
-- Can be attached to tasks, vendors, or any entity
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'vendor', 'guest', 'expense', 'general')),
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON public.comments(wedding_id, entity_type, entity_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct access to comments"
  ON public.comments FOR SELECT USING (false);

CREATE POLICY "Deny direct writes to comments"
  ON public.comments FOR INSERT WITH CHECK (false);
