-- Add a placeholder wedding date column that the calculator handoff fills in
-- from the user's chosen month. Distinct from `weddings.date` (which only the
-- user sets explicitly) so other features that depend on a real date — phase
-- transitions, the post-wedding archival flow, countdown widgets — never act
-- on a guess.
--
-- Read by the wedding_milestones email sequence as a fallback anchor when
-- `date` is null. Once the user confirms their actual `date`, that takes
-- precedence and `inferred_date` is effectively ignored.

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS inferred_date date NULL;

COMMENT ON COLUMN public.weddings.inferred_date IS
  'Placeholder wedding date inferred from calculator inputs (month only). '
  'Used solely as a fallback anchor for the wedding_milestones email sequence. '
  'Other features must use weddings.date (which stays null until user confirms).';
