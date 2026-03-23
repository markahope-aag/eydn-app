-- Email preferences for CAN-SPAM compliance
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  marketing_emails BOOLEAN NOT NULL DEFAULT TRUE,
  deadline_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  lifecycle_emails BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_all BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id),
  UNIQUE(unsubscribe_token)
);

CREATE INDEX idx_email_preferences_wedding ON public.email_preferences(wedding_id);
CREATE INDEX idx_email_preferences_token ON public.email_preferences(unsubscribe_token);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
