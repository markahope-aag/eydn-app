-- Add explicit deny-all policies for tables that use service role only
-- This silences the "RLS enabled but no policies" linter warning

-- email_preferences
CREATE POLICY "Deny direct access to email_preferences"
  ON public.email_preferences FOR ALL USING (false) WITH CHECK (false);

-- guide_responses
CREATE POLICY "Deny direct access to guide_responses"
  ON public.guide_responses FOR ALL USING (false) WITH CHECK (false);

-- promo_code_redemptions
CREATE POLICY "Deny direct access to promo_code_redemptions"
  ON public.promo_code_redemptions FOR ALL USING (false) WITH CHECK (false);

-- promo_codes
CREATE POLICY "Deny direct access to promo_codes"
  ON public.promo_codes FOR ALL USING (false) WITH CHECK (false);

-- waitlist
CREATE POLICY "Deny direct access to waitlist"
  ON public.waitlist FOR ALL USING (false) WITH CHECK (false);
