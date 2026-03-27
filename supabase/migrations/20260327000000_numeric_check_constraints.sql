-- Add CHECK constraints to prevent negative values on numeric fields.
-- API validation exists for some paths but not all — DB constraints
-- are the safety net that catches anything the API misses.

-- Budget must be non-negative
ALTER TABLE weddings
  ADD CONSTRAINT weddings_budget_non_negative
  CHECK (budget IS NULL OR budget >= 0);

-- Expenses: estimated, amount_paid, final_cost must be non-negative
ALTER TABLE expenses
  ADD CONSTRAINT expenses_estimated_non_negative
  CHECK (estimated IS NULL OR estimated >= 0);

ALTER TABLE expenses
  ADD CONSTRAINT expenses_amount_paid_non_negative
  CHECK (amount_paid IS NULL OR amount_paid >= 0);

ALTER TABLE expenses
  ADD CONSTRAINT expenses_final_cost_non_negative
  CHECK (final_cost IS NULL OR final_cost >= 0);

-- Vendor amounts must be non-negative
ALTER TABLE vendors
  ADD CONSTRAINT vendors_amount_non_negative
  CHECK (amount IS NULL OR amount >= 0);

ALTER TABLE vendors
  ADD CONSTRAINT vendors_amount_paid_non_negative
  CHECK (amount_paid IS NULL OR amount_paid >= 0);

-- Seating table capacity must be positive
ALTER TABLE seating_tables
  ADD CONSTRAINT seating_tables_capacity_positive
  CHECK (capacity > 0);

-- Guest count estimate must be non-negative
ALTER TABLE weddings
  ADD CONSTRAINT weddings_guest_count_non_negative
  CHECK (guest_count_estimate IS NULL OR guest_count_estimate >= 0);

-- Rehearsal dinner capacity must be non-negative
ALTER TABLE rehearsal_dinner
  ADD CONSTRAINT rehearsal_dinner_capacity_non_negative
  CHECK (capacity IS NULL OR capacity >= 0);
