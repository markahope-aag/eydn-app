-- Promote ceremony_time to a first-class field on weddings.
-- This is the single source of truth — day_of_plans.content.ceremonyTime
-- is kept in sync but weddings.ceremony_time is canonical.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS ceremony_time text;
