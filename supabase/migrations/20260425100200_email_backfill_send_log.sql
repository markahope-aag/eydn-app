-- Cutover protection: backfill sequence_send_log from the legacy dedup tables
-- (trial_email_log + lifecycle_emails). Without this, switching the cron routes
-- to the new runner would re-send every email to every existing recipient on the
-- next run.
--
-- Recipient email and Clerk user_id aren't always knowable at backfill time
-- (lifecycle_emails only stores wedding_id), so we relax recipient_email to
-- nullable and write '' for backfilled rows where we resolve user_id but not
-- email. The dedup unique key (sequence_slug, step_order, user_id) is what
-- actually matters for preventing re-sends.

ALTER TABLE public.sequence_send_log
  ALTER COLUMN recipient_email DROP NOT NULL;

-- Trial expiry backfill: trial_email_log.email_type → step_order
INSERT INTO public.sequence_send_log
  (sequence_slug, step_order, user_id, wedding_id, recipient_email, sent_at)
SELECT
  'trial_expiry',
  CASE t.email_type
    WHEN 'day_10_save_card'    THEN 10
    WHEN 'day_14_renews_today' THEN 14
    WHEN 'day_14_downgraded'   THEN 15
  END AS step_order,
  t.user_id,
  (SELECT id FROM public.weddings w WHERE w.user_id = t.user_id ORDER BY w.created_at LIMIT 1),
  NULL,
  t.sent_at
FROM public.trial_email_log t
WHERE t.email_type IN ('day_10_save_card', 'day_14_renews_today', 'day_14_downgraded')
ON CONFLICT (sequence_slug, step_order, user_id) DO NOTHING;

-- Wedding lifecycle backfill: lifecycle_emails.email_type → step_order
INSERT INTO public.sequence_send_log
  (sequence_slug, step_order, user_id, wedding_id, recipient_email, sent_at)
SELECT
  'wedding_lifecycle',
  CASE l.email_type
    WHEN 'post_wedding_welcome'    THEN 1
    WHEN 'download_reminder_1mo'   THEN 2
    WHEN 'download_reminder_6mo'   THEN 3
    WHEN 'download_reminder_9mo'   THEN 4
    WHEN 'memory_plan_offer'       THEN 5
    WHEN 'archive_notice'          THEN 6
    WHEN 'sunset_warning_21mo'     THEN 7
    WHEN 'sunset_final'            THEN 8
  END AS step_order,
  w.user_id,
  l.wedding_id,
  NULL,
  l.sent_at
FROM public.lifecycle_emails l
JOIN public.weddings w ON w.id = l.wedding_id
WHERE l.email_type IN (
  'post_wedding_welcome', 'download_reminder_1mo', 'download_reminder_6mo',
  'download_reminder_9mo', 'memory_plan_offer', 'archive_notice',
  'sunset_warning_21mo', 'sunset_final'
)
AND w.user_id IS NOT NULL
ON CONFLICT (sequence_slug, step_order, user_id) DO NOTHING;
