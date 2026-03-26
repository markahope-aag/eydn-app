-- Stores prior planning tools data from onboarding Screen 7
-- Used for segmentation: knowing whether a couple came from Zola vs. a spreadsheet
-- changes the follow-up conversation entirely.

CREATE TABLE IF NOT EXISTS public.onboarding_survey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  prior_tools TEXT[] NOT NULL DEFAULT '{}',
  venue_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wedding_id)
);

ALTER TABLE public.onboarding_survey ENABLE ROW LEVEL SECURITY;

-- Only the wedding owner can read their own survey
CREATE POLICY "Users can read own onboarding survey"
  ON public.onboarding_survey FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE user_id = (SELECT auth.uid()::text)
    )
  );

-- Block direct writes (service role handles inserts)
CREATE POLICY "No direct inserts to onboarding_survey"
  ON public.onboarding_survey FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct updates to onboarding_survey"
  ON public.onboarding_survey FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct deletes to onboarding_survey"
  ON public.onboarding_survey FOR DELETE
  USING (false);

-- Add venue_city column to weddings if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'weddings' AND column_name = 'venue_city'
  ) THEN
    ALTER TABLE public.weddings ADD COLUMN venue_city TEXT;
  END IF;
END $$;
