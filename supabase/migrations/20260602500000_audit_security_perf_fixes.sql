-- Audit remediation: lock down public/dead RLS policies and add an aggregate
-- RPC for the admin events page.

-- C2: calculator_saves was world-readable (SELECT USING (true)) and
-- world-insertable, leaking every lead's name/email/budget to any anon or
-- authenticated PostgREST client. Every real read/write path uses the
-- service-role admin client (the share page and the calculator-save route),
-- which bypasses RLS, so drop both public policies and deny anon/authenticated.
DROP POLICY IF EXISTS "Anyone can read by short code" ON public.calculator_saves;
DROP POLICY IF EXISTS "Anyone can insert" ON public.calculator_saves;

CREATE POLICY "Deny anonymous reads on calculator_saves"
  ON public.calculator_saves FOR SELECT USING (false);
CREATE POLICY "Deny anonymous writes on calculator_saves"
  ON public.calculator_saves FOR INSERT WITH CHECK (false);

-- H7: date_change_alerts and onboarding_survey used auth.uid()-based policies.
-- Under Clerk auth, auth.uid() is always NULL, so these policies grant nothing
-- and merely imply a PostgREST-level tenant isolation the app does not rely on
-- (isolation is enforced in app code via getWeddingForUser + service role).
-- Replace with explicit denials to match the documented service-role model.
DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.date_change_alerts;
CREATE POLICY "Deny anonymous reads on date_change_alerts"
  ON public.date_change_alerts FOR SELECT USING (false);
CREATE POLICY "Deny anonymous writes on date_change_alerts"
  ON public.date_change_alerts FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny anonymous updates on date_change_alerts"
  ON public.date_change_alerts FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Deny anonymous deletes on date_change_alerts"
  ON public.date_change_alerts FOR DELETE USING (false);

DROP POLICY IF EXISTS "Users can read own onboarding survey" ON public.onboarding_survey;
CREATE POLICY "Deny anonymous reads on onboarding_survey"
  ON public.onboarding_survey FOR SELECT USING (false);

-- H6: the admin events page issued 5 queries per wedding (N+1, unbounded).
-- Replace with one grouped-aggregate RPC. Service-role only.
CREATE OR REPLACE FUNCTION public.admin_wedding_event_stats()
RETURNS TABLE (
  wedding_id uuid,
  guests bigint,
  tasks bigint,
  completed_tasks bigint,
  vendors bigint,
  spent numeric
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    w.id AS wedding_id,
    COALESCE(g.cnt, 0) AS guests,
    COALESCE(t.cnt, 0) AS tasks,
    COALESCE(t.done, 0) AS completed_tasks,
    COALESCE(v.cnt, 0) AS vendors,
    COALESCE(e.spent, 0)::numeric AS spent
  FROM public.weddings w
  LEFT JOIN (
    SELECT wedding_id, count(*) AS cnt
    FROM public.guests GROUP BY wedding_id
  ) g ON g.wedding_id = w.id
  LEFT JOIN (
    SELECT wedding_id, count(*) AS cnt, count(*) FILTER (WHERE completed) AS done
    FROM public.tasks GROUP BY wedding_id
  ) t ON t.wedding_id = w.id
  LEFT JOIN (
    SELECT wedding_id, count(*) AS cnt
    FROM public.vendors GROUP BY wedding_id
  ) v ON v.wedding_id = w.id
  LEFT JOIN (
    SELECT wedding_id, sum(amount_paid) AS spent
    FROM public.expenses GROUP BY wedding_id
  ) e ON e.wedding_id = w.id;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_wedding_event_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_wedding_event_stats() TO service_role;
