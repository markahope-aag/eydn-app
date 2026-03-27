-- Move pg_trgm extension from public schema to extensions schema
-- Fixes Supabase linter warning: extension_in_public
-- Must drop dependent indexes first, then recreate after move
CREATE SCHEMA IF NOT EXISTS extensions;
DROP INDEX IF EXISTS idx_suggested_vendors_name_trgm;
DROP INDEX IF EXISTS idx_suggested_vendors_city_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_name_trgm
  ON public.suggested_vendors USING GIN(name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_city_trgm
  ON public.suggested_vendors USING GIN(city extensions.gin_trgm_ops);
