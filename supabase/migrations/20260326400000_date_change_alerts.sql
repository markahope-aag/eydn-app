-- Track date/time change alerts that require user acknowledgment
CREATE TABLE IF NOT EXISTS date_change_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id),
  change_type text NOT NULL, -- 'wedding_date', 'ceremony_time', 'rehearsal_date'
  old_value text,
  new_value text,
  affected_tasks jsonb DEFAULT '[]',
  message text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE date_change_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts"
  ON date_change_alerts
  FOR ALL
  USING (wedding_id IN (SELECT id FROM weddings WHERE user_id = auth.uid()))
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE user_id = auth.uid()));
