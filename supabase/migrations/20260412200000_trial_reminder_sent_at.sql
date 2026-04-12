-- Track whether the 3-day trial-expiry reminder email has been sent for
-- a wedding. Null = not sent yet. Used as a dedupe key so the daily cron
-- never emails the same couple twice.

ALTER TABLE public.weddings
  ADD COLUMN trial_reminder_sent_at timestamptz;
