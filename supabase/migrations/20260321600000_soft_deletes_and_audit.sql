-- Soft deletes: add deleted_at column to all critical tables
ALTER TABLE public.guests ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.vendors ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.expenses ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.wedding_party ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.seating_tables ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.mood_board_items ADD COLUMN deleted_at TIMESTAMPTZ;

-- Indexes for soft delete filtering
CREATE INDEX idx_guests_active ON public.guests(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_active ON public.vendors(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_active ON public.tasks(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_active ON public.expenses(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wedding_party_active ON public.wedding_party(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_seating_tables_active ON public.seating_tables(wedding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mood_board_items_active ON public.mood_board_items(wedding_id) WHERE deleted_at IS NULL;

-- Activity log for audit trail
CREATE TABLE public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_wedding ON public.activity_log(wedding_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to activity_log"
  ON public.activity_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
