CREATE TABLE IF NOT EXISTS public.trial_email_log (
  user_id text NOT NULL,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, email_type)
);

CREATE INDEX IF NOT EXISTS trial_email_log_sent_at_idx
  ON public.trial_email_log (sent_at);

ALTER TABLE public.trial_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.trial_email_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
