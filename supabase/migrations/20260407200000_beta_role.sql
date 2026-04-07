-- Add beta role to user_roles for beta testers with full access
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('user', 'admin', 'vendor', 'beta'));
