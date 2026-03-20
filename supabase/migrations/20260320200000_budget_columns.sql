-- Add estimated, amount_paid, and final_cost columns to expenses
-- Migrate: current 'amount' becomes 'estimated', current 'paid' boolean logic moves to amount_paid
alter table public.expenses
  rename column amount to estimated;

alter table public.expenses
  add column amount_paid numeric(12,2) not null default 0,
  add column final_cost numeric(12,2);

-- Migrate: if paid was true, copy estimated into amount_paid
update public.expenses set amount_paid = estimated where paid = true;
