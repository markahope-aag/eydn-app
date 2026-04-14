-- Remove the vendor monetization schema.
-- Per the Eydn Pledge, vendors are never charged. The placement tier
-- and placement tables were built for a paid directory model that was
-- scrapped before launch — all charging code has already been removed
-- from /api/vendor-portal/checkout, /api/admin/placement-tiers, and
-- the Stripe webhook. These tables are the last vestigial piece.

DROP TABLE IF EXISTS public.vendor_placements;
DROP TABLE IF EXISTS public.placement_tiers;
