-- AI catch-up plans — surfaced to Pro users when their planning progress
-- has stalled (overdue tasks, or nothing completed in a week). Each row
-- is a single generated plan for a wedding; the "latest plan" query is
-- (wedding_id, generated_at desc) + dismissed_at is null.

CREATE TABLE public.catch_up_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  -- Human-readable reason the plan was generated (e.g. "8 overdue tasks").
  trigger_reason text NOT NULL,
  -- Structured plan returned by Claude. Schema is enforced in the app layer.
  -- Expected shape: { summary: string, priorities: [{ title, why, when }] }.
  plan jsonb NOT NULL,
  -- Which Claude model produced this plan (for cost + quality tracking).
  model text NOT NULL,
  -- Set when the user dismisses the plan; null means it's still active.
  dismissed_at timestamptz
);

CREATE INDEX catch_up_plans_wedding_latest_idx
  ON public.catch_up_plans (wedding_id, generated_at DESC);

CREATE INDEX catch_up_plans_active_idx
  ON public.catch_up_plans (wedding_id)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.catch_up_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to catch_up_plans"
  ON public.catch_up_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);
