-- Ensure activity_log RLS denies direct access (service role bypasses RLS anyway)
-- Drop the overly permissive policy if it still exists
DROP POLICY IF EXISTS "Service role full access to activity_log" ON public.activity_log;

-- Deny all direct access — API routes use service role which bypasses RLS
CREATE POLICY "Deny direct activity_log access"
  ON public.activity_log FOR ALL
  USING (false)
  WITH CHECK (false);
