-- Wedding lifecycle phase tracking
ALTER TABLE public.weddings
  ADD COLUMN phase TEXT NOT NULL DEFAULT 'active'
    CHECK (phase IN ('active', 'post_wedding', 'archived', 'sunset'));

-- Memory plan subscription for post-wedding data retention
ALTER TABLE public.weddings
  ADD COLUMN memory_plan_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN memory_plan_expires_at TIMESTAMPTZ;

-- Track when lifecycle emails were sent
CREATE TABLE public.lifecycle_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'post_wedding_welcome',
    'download_reminder_3mo',
    'download_reminder_6mo',
    'download_reminder_9mo',
    'archive_notice',
    'sunset_warning_21mo',
    'sunset_final',
    'memory_plan_offer'
  )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wedding_id, email_type)
);

CREATE INDEX idx_lifecycle_emails_wedding ON public.lifecycle_emails(wedding_id);
CREATE INDEX idx_weddings_phase ON public.weddings(phase);

ALTER TABLE public.lifecycle_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct access to lifecycle_emails"
  ON public.lifecycle_emails FOR SELECT
  USING (false);

CREATE POLICY "Deny direct inserts to lifecycle_emails"
  ON public.lifecycle_emails FOR INSERT
  WITH CHECK (false);
