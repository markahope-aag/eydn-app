-- Fix Supabase linter warnings: set search_path on functions

CREATE OR REPLACE FUNCTION public.increment_promo_uses(code_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = code_id
  RETURNING current_uses INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
