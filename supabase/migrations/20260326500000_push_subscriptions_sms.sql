-- Web push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wedding_id, user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON push_subscriptions FOR ALL USING (false) WITH CHECK (false);

-- Add SMS opt-in to email preferences
ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS sms_reminders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_number text;

-- Add push notification opt-in
ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT true;
