-- Track email delivery, opens, clicks, and bounces via Resend webhooks
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text NOT NULL,
  email_to text NOT NULL,
  event_type text NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_email_id ON email_events(email_id);
CREATE INDEX idx_email_events_to ON email_events(email_to);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON email_events FOR ALL USING (false) WITH CHECK (false);
