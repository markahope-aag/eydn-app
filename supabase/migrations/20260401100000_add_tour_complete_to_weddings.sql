ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS tour_complete boolean NOT NULL DEFAULT false;
