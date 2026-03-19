-- Admin tables are accessed via service role only.
-- These policies block all direct client access, satisfying the RLS linter.

create policy "No direct access to user_roles"
  on public.user_roles for all
  using (false);

create policy "No direct access to app_settings"
  on public.app_settings for all
  using (false);
