-- AI budget optimizations — surfaced to Pro users when one or more budget
-- categories have gone meaningfully over their estimated allocation.
-- Same shape as catch_up_plans: one row per generated suggestion,
-- dismiss via dismissed_at. "Latest active" query is
-- (wedding_id, generated_at desc) where dismissed_at is null.

CREATE TABLE public.budget_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  trigger_reason text NOT NULL,
  -- Structured suggestion from Claude. Expected shape:
  -- { summary: string, suggestions: [{ title, why, action }] }.
  suggestion jsonb NOT NULL,
  model text NOT NULL,
  dismissed_at timestamptz
);

CREATE INDEX budget_optimizations_wedding_latest_idx
  ON public.budget_optimizations (wedding_id, generated_at DESC);

CREATE INDEX budget_optimizations_active_idx
  ON public.budget_optimizations (wedding_id)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.budget_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to budget_optimizations"
  ON public.budget_optimizations
  FOR ALL
  USING (true)
  WITH CHECK (true);
