-- Cron job execution log for admin monitoring
CREATE TABLE public.cron_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  duration_ms INTEGER,
  details JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cron_log_job ON public.cron_log(job_name, started_at DESC);

ALTER TABLE public.cron_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct access to cron_log"
  ON public.cron_log FOR SELECT USING (false);

CREATE POLICY "Deny direct writes to cron_log"
  ON public.cron_log FOR INSERT WITH CHECK (false);
