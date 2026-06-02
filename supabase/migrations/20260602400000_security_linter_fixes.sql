-- Address Supabase database linter security findings.

-- 1. vendor_seed_lookups had RLS disabled. The table is written/read only by
--    the service-role admin client (see src/lib/vendor-seed-quota.ts), so
--    enabling RLS with no policies locks out anon/authenticated while the
--    service role continues to bypass RLS.
ALTER TABLE public.vendor_seed_lookups ENABLE ROW LEVEL SECURITY;

-- 2. budget_optimizations / catch_up_plans: the "Service role full access"
--    policies were FOR ALL USING (true) WITH CHECK (true) with no TO clause, so
--    they applied to PUBLIC — effectively granting every anon/authenticated
--    user full read/write. Both tables are only ever accessed via the
--    service-role admin client (api/budget-optimize and api/catch-up go through
--    getWeddingForUser -> createSupabaseAdmin), which bypasses RLS. Dropping the
--    policies leaves RLS enabled with no policy, closing the hole with no
--    functional impact.
DROP POLICY IF EXISTS "Service role full access to budget_optimizations" ON public.budget_optimizations;
DROP POLICY IF EXISTS "Service role full access to catch_up_plans" ON public.catch_up_plans;

-- 3. handle_guest_soft_delete_cascade is a SECURITY DEFINER trigger function
--    that was also callable as an RPC by anon/authenticated. Trigger functions
--    fire regardless of EXECUTE grants, so revoking EXECUTE removes the RPC
--    surface without affecting the trigger on public.guests.
REVOKE EXECUTE ON FUNCTION public.handle_guest_soft_delete_cascade() FROM PUBLIC, anon, authenticated;

-- 4. Pin a non-mutable search_path on the remaining flagged functions so they
--    can't be hijacked via a role-mutable search_path.
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.clear_wedding_geocode_when_city_cleared() SET search_path = public;
ALTER FUNCTION public.increment_promo_uses(uuid) SET search_path = public;

-- Note: calculator_saves' "Anyone can insert" / "Anyone can read by short code"
-- policies are intentionally public — they back the marketing budget calculator
-- (anonymous lead capture and shareable results by short code) — so they are
-- left unchanged.
