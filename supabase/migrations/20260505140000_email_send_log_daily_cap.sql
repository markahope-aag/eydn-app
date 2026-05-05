-- Centralized send log for the per-recipient daily cap.
--
-- Every non-transactional outbound email is logged here. Before sending a
-- non-transactional email, the runner checks for any non-transactional row
-- to the same recipient_email in the last 24h; if one exists, the send is
-- deferred and retries on the next cron pass. Sequence steps that defer do
-- NOT get logged in `sequence_send_log`, so they remain "due" and naturally
-- drain at one per recipient per day.
--
-- Transactional sends (welcome, password reset, payment receipts, invites)
-- are exempt from the cap — they always go — but they're still logged here
-- for audit + future analytics.

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email  text NOT NULL,
  user_id          text,
  category         text NOT NULL CHECK (category IN ('transactional', 'lifecycle', 'marketing', 'nurture')),
  sequence_slug    text,
  step_order       int,
  template_slug    text,
  resend_email_id  text,
  sent_at          timestamptz NOT NULL DEFAULT now()
);

-- Cap query reads (recipient_email, sent_at) filtered by category — partial
-- index keeps the hot path tight without indexing transactional traffic.
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient_capped
  ON public.email_send_log (recipient_email, sent_at DESC)
  WHERE category <> 'transactional';

CREATE INDEX IF NOT EXISTS idx_email_send_log_user
  ON public.email_send_log (user_id, sent_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at
  ON public.email_send_log (sent_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.email_send_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Backfill the last 48 hours from sequence_send_log so the cap is aware of
-- the 2026-05-04 / 2026-05-05 catch-up burst that triggered this work.
-- Without this, tomorrow's cron pass would happily send another email to
-- everyone we just spammed.
INSERT INTO public.email_send_log
  (recipient_email, user_id, category, sequence_slug, step_order, resend_email_id, sent_at)
SELECT
  ssl.recipient_email,
  ssl.user_id,
  COALESCE(t.category, 'lifecycle') AS category,
  ssl.sequence_slug,
  ssl.step_order,
  ssl.resend_email_id,
  ssl.sent_at
FROM public.sequence_send_log ssl
LEFT JOIN public.email_sequence_steps s
  ON s.sequence_slug = ssl.sequence_slug AND s.step_order = ssl.step_order
LEFT JOIN public.email_templates t
  ON t.slug = s.template_slug
WHERE ssl.sent_at >= now() - interval '48 hours';
