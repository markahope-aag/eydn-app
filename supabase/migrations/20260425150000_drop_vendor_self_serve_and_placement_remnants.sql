-- Finish the vendor monetization removal.
--
-- An earlier migration (20260414100000_drop_vendor_monetization.sql) dropped
-- vendor_placements + placement_tiers but left vendor_accounts, vendor_analytics,
-- the placement_* columns on suggested_vendors, and 'vendor' in user_roles.role
-- in place. With paid placements permanently scrapped (per the Eydn Pledge),
-- the remaining surface area only existed to support that model and serves no
-- purpose without it.
--
-- After this migration: the vendor self-registration flow, the per-vendor
-- analytics tracking, and the orphaned placement columns are gone. The only
-- vendor-shaped tables left are:
--   - vendors             (per-wedding tracking that couples manage)
--   - suggested_vendors   (the platform directory)
--   - vendor_submissions  (couples suggesting vendors for the directory)

-- Drop the orphaned columns on suggested_vendors first — they hold the only
-- remaining FK reference into vendor_accounts.
ALTER TABLE public.suggested_vendors
  DROP COLUMN IF EXISTS vendor_account_id,
  DROP COLUMN IF EXISTS placement_tier,
  DROP COLUMN IF EXISTS placement_expires_at;

-- vendor_analytics also referenced vendor_accounts; drop it next.
DROP TABLE IF EXISTS public.vendor_analytics;

-- Now safe to drop vendor_accounts.
DROP TABLE IF EXISTS public.vendor_accounts;

-- 'vendor' user role only existed for the self-serve portal. Strip it from
-- the CHECK constraint. (No live rows should have role='vendor' now that the
-- portal is gone, but if any did they would block this — the prior migration
-- never cleaned them up. Belt-and-suspenders: demote them first.)
UPDATE public.user_roles SET role = 'user' WHERE role = 'vendor';

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('user', 'admin', 'beta'));
