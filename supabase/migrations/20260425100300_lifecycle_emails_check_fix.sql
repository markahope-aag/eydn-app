-- Fix the lifecycle_emails CHECK constraint: it was missing
-- 'download_reminder_1mo' (which getLifecycleEmail/getEmailsDue both reference),
-- and listing 'download_reminder_3mo' which is never sent. The new email
-- sequence runner mirrors successful sends back into this table for backward
-- compat with the admin stats reader, so the constraint needs to allow every
-- type the runner can produce.

ALTER TABLE public.lifecycle_emails
  DROP CONSTRAINT IF EXISTS lifecycle_emails_email_type_check;

ALTER TABLE public.lifecycle_emails
  ADD CONSTRAINT lifecycle_emails_email_type_check CHECK (email_type IN (
    'post_wedding_welcome',
    'download_reminder_1mo',
    'download_reminder_6mo',
    'download_reminder_9mo',
    'memory_plan_offer',
    'archive_notice',
    'sunset_warning_21mo',
    'sunset_final'
  ));
