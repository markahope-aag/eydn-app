-- Backfill protection for the two newly-added sequences (trial_downgraded and
-- wedding_milestones). Without this, the first cron run after deploy would find
-- every step "due" for every existing wedding and send a flood of historical
-- emails (8 nurture messages for downgraded users, up to 9 milestone messages
-- for couples mid-planning).
--
-- For existing weddings (= present at the time this migration runs), we
-- pre-write a sequence_send_log row for every step so the runner treats them
-- as already sent. New weddings created after this migration get the full
-- sequence experience; old weddings get nothing from these new sequences.
--
-- Note: trial_expiry (existing sequence) is NOT backfilled. Mid-trial users
-- catching up on the new days 11/12/13 emails is a one-time, time-bounded
-- effect — only users currently in days 11-14 of trial are affected.

INSERT INTO public.sequence_send_log
  (sequence_slug, step_order, user_id, wedding_id, recipient_email, sent_at)
SELECT
  step.sequence_slug,
  step.step_order,
  w.user_id,
  w.id,
  NULL,
  now()
FROM public.weddings w
CROSS JOIN public.email_sequence_steps step
WHERE step.sequence_slug IN ('trial_downgraded', 'wedding_milestones')
  AND w.user_id IS NOT NULL
ON CONFLICT (sequence_slug, step_order, user_id) DO NOTHING;
