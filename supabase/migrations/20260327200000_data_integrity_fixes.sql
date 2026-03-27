-- Fix #20: Add missing RLS policies on rehearsal_dinner (UPDATE + DELETE)
CREATE POLICY "Deny direct updates" ON public.rehearsal_dinner FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct deletes" ON public.rehearsal_dinner FOR DELETE USING (false);

-- Fix #22: Add soft-delete column to seat_assignments and auto-cascade
-- with guest soft-delete/restore
ALTER TABLE public.seat_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION handle_guest_soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Guest soft-deleted: soft-delete their seat assignment too
    UPDATE public.seat_assignments SET deleted_at = NEW.deleted_at
    WHERE guest_id = NEW.id AND deleted_at IS NULL;
  ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    -- Guest restored: restore their seat assignment
    UPDATE public.seat_assignments SET deleted_at = NULL
    WHERE guest_id = NEW.id AND deleted_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guest_soft_delete_cascade ON public.guests;
CREATE TRIGGER guest_soft_delete_cascade
  AFTER UPDATE OF deleted_at ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION handle_guest_soft_delete_cascade();
