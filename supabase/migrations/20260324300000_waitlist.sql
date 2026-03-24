-- Waitlist for beta signup overflow
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'beta',
  discount_code_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX waitlist_email_idx ON public.waitlist(LOWER(email));
CREATE INDEX waitlist_source_idx ON public.waitlist(source);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
