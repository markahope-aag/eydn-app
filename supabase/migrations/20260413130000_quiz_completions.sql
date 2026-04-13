CREATE TABLE IF NOT EXISTS public.quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id text NOT NULL CHECK (quiz_id IN ('planning_style', 'planner_assessment')),
  email text NOT NULL,
  first_name text,
  result_key text NOT NULL,
  result_label text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_completions_email_idx ON public.quiz_completions (email);
CREATE INDEX IF NOT EXISTS quiz_completions_quiz_result_idx ON public.quiz_completions (quiz_id, result_key);
CREATE INDEX IF NOT EXISTS quiz_completions_created_at_idx ON public.quiz_completions (created_at DESC);

ALTER TABLE public.quiz_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.quiz_completions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
