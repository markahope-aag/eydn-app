-- Add missing indexes on foreign key columns used in joins and lookups
CREATE INDEX IF NOT EXISTS idx_seat_assignments_seating_table
  ON public.seat_assignments(seating_table_id);

CREATE INDEX IF NOT EXISTS idx_seat_assignments_guest
  ON public.seat_assignments(guest_id);

CREATE INDEX IF NOT EXISTS idx_expenses_vendor
  ON public.expenses(vendor_id);
