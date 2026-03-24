-- Atomic promo code usage increment to prevent race conditions
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
$$ LANGUAGE plpgsql;
