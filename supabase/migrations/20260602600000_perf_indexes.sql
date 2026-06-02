-- Performance: indexes for hot queries that filter/sort on columns not covered
-- by existing indexes.

-- tasks: the dashboard, chat context, and check-deadlines cron all order active,
-- incomplete tasks for a wedding by due_date. A partial composite index lets
-- Postgres satisfy the filter + sort without scanning all of a wedding's tasks.
CREATE INDEX IF NOT EXISTS idx_tasks_wedding_due
  ON public.tasks (wedding_id, due_date)
  WHERE deleted_at IS NULL AND completed = false;

-- waitlist + calculator_saves: the admin leads page sorts all rows by
-- created_at DESC. These tables grow with every marketing campaign.
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at
  ON public.waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calculator_saves_created_at
  ON public.calculator_saves (created_at DESC);
