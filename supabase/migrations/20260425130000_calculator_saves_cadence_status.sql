-- Track Cadence newsletter sync status per calculator save so a silent
-- env-var misconfiguration or Cadence outage stops being invisible. Both
-- columns nullable: a NULL synced_at + NULL error means the sync hasn't
-- been attempted yet (legacy rows), success writes synced_at, failure
-- writes error.

ALTER TABLE public.calculator_saves
  ADD COLUMN IF NOT EXISTS cadence_synced_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cadence_error    text NULL;
