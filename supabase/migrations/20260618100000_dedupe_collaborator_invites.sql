-- Collaborator invites could be created multiple times for the same email on a
-- wedding because no unique constraint was enforced. The duplicate rows caused:
--   1. A security gap: removing a collaborator deleted only one row, leaving a
--      duplicate/pending row that silently re-granted access on next sign-in
--      (the DELETE route now purges all rows for the collaborator; this cleans
--      up the existing data).
--   2. Auto-accept (resolveWeddingForUserId) used .single() and errored when
--      duplicate pending rows existed, blocking those invitees from accepting.
--
-- Deduplicate, then enforce uniqueness so it can't recur.

-- 1. Normalize stored emails (the API already lowercases/trims on insert, but
--    older rows may not be) so dedup + the unique index group reliably.
update public.wedding_collaborators
set email = lower(trim(email))
where email is not null
  and email is distinct from lower(trim(email));

-- 2. Drop duplicates, keeping the best row per (wedding_id, email): prefer an
--    accepted row (one with a user_id), then the most recently created.
delete from public.wedding_collaborators
where id in (
  select id from (
    select id,
      row_number() over (
        partition by wedding_id, email
        order by (user_id is not null) desc, created_at desc, id desc
      ) as rn
    from public.wedding_collaborators
    where email is not null
  ) ranked
  where rn > 1
);

-- 3. Enforce one invite per email per wedding. NULL emails are allowed to
--    repeat (Postgres treats NULLs as distinct), which is fine — invites always
--    carry an email.
create unique index if not exists wedding_collaborators_wedding_email_uniq
  on public.wedding_collaborators (wedding_id, email);
