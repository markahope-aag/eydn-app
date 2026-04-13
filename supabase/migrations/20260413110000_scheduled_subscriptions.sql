CREATE TABLE IF NOT EXISTS public.scheduled_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  wedding_id uuid REFERENCES public.weddings(id) ON DELETE SET NULL,
  stripe_customer_id text NOT NULL,
  stripe_payment_method_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('pro_monthly', 'lifetime')),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed', 'cancelled', 'superseded')),
  failure_count int NOT NULL DEFAULT 0,
  last_failure_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS scheduled_subscriptions_user_id_idx
  ON public.scheduled_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS scheduled_subscriptions_due_idx
  ON public.scheduled_subscriptions (scheduled_for)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_subscriptions_user_pending_idx
  ON public.scheduled_subscriptions (user_id)
  WHERE status = 'pending';

ALTER TABLE public.scheduled_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin-only access. Route handlers use the service role key.
CREATE POLICY "service_role_all" ON public.scheduled_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
