-- Prevent a user from redeeming the same promo code more than once.
--
-- /api/subscribe checked for an existing redemption before inserting, but
-- two concurrent requests could both pass the check (TOCTOU) and create
-- two redemptions — and on a 100%-off code, two active purchases. This
-- unique index makes the database the gate.
create unique index if not exists promo_code_redemptions_user_code_idx
  on public.promo_code_redemptions (promo_code_id, user_id);

-- Make the usage counter respect max_uses atomically. Previously the
-- increment was unconditional, so concurrent redemptions could push
-- current_uses past max_uses. Returns the new count, or NULL if the code
-- was already at its limit.
create or replace function public.increment_promo_uses(code_id uuid)
returns integer as $$
declare
  new_count integer;
begin
  update public.promo_codes
  set current_uses = current_uses + 1
  where id = code_id
    and (max_uses is null or current_uses < max_uses)
  returning current_uses into new_count;
  return new_count;
end;
$$ language plpgsql;
