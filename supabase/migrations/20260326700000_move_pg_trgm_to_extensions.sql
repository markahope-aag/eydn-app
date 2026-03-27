-- Move pg_trgm extension from public schema to extensions schema
-- Fixes Supabase linter warning: extension_in_public
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
