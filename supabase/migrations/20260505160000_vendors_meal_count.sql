-- Replace the binary `meal_needed` flag on vendors with a `meal_count`
-- integer so couples can record vendors that bring assistants (e.g. a
-- photographer + 2nd shooter, or a band that needs 5 meals). Existing
-- rows with meal_needed=true backfill to 1; everything else to 0.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS meal_count integer NOT NULL DEFAULT 0;

UPDATE public.vendors
SET meal_count = CASE WHEN meal_needed THEN 1 ELSE 0 END
WHERE meal_needed IS NOT NULL;

ALTER TABLE public.vendors
  DROP COLUMN IF EXISTS meal_needed;
