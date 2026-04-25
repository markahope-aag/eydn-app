-- Generic email template + sequence engine.
-- Lets the admin author/edit transactional and lifecycle emails without code deploys,
-- while the cron runner pulls templates and step definitions from these tables.

-- Editable email templates. The slug is the stable key referenced by code + sequence steps.
CREATE TABLE IF NOT EXISTS public.email_templates (
  slug          text PRIMARY KEY,
  category      text NOT NULL CHECK (category IN ('transactional', 'lifecycle', 'marketing', 'nurture')),
  description   text,
  subject       text NOT NULL,
  html          text NOT NULL,
  variables     text[] NOT NULL DEFAULT '{}',
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Sequences group ordered steps under a single trigger event.
-- trigger_event values are matched in code (see src/lib/email-sequences.ts):
--   'trial_started'      anchor = wedding.trial_started_at (or created_at fallback)
--   'trial_downgraded'   anchor = day the trial dropped to free
--   'wedding_date'       anchor = wedding.date  (offset_days < 0 = pre-wedding milestones)
CREATE TABLE IF NOT EXISTS public.email_sequences (
  slug              text PRIMARY KEY,
  description       text,
  trigger_event     text NOT NULL,
  audience_filter   jsonb NOT NULL DEFAULT '{}',
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Each step targets one template at a (signed) day offset from the sequence anchor.
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_slug   text NOT NULL REFERENCES public.email_sequences(slug) ON DELETE CASCADE,
  step_order      int NOT NULL,
  template_slug   text NOT NULL REFERENCES public.email_templates(slug),
  offset_days     int NOT NULL,
  audience_filter jsonb NOT NULL DEFAULT '{}',
  enabled         boolean NOT NULL DEFAULT true,
  UNIQUE (sequence_slug, step_order)
);

CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence
  ON public.email_sequence_steps(sequence_slug, step_order);

-- One row per (sequence step, recipient) — the dedup + audit trail for the runner.
CREATE TABLE IF NOT EXISTS public.sequence_send_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_slug   text NOT NULL,
  step_order      int NOT NULL,
  user_id         text NOT NULL,
  wedding_id      uuid REFERENCES public.weddings(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  resend_email_id text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_slug, step_order, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_send_log_sent_at
  ON public.sequence_send_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_sequence_send_log_wedding
  ON public.sequence_send_log(wedding_id);

-- Lock down to service_role only — admin UI will go through API routes that use the admin client.
ALTER TABLE public.email_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_send_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.email_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.email_sequences
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.email_sequence_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.sequence_send_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at trigger for templates + sequences
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS email_sequences_updated_at ON public.email_sequences;
CREATE TRIGGER email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
