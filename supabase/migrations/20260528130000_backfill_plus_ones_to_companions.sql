-- A previous migration (20260522100000_guest_party.sql) introduced the
-- party_head_id model so that companions (plus-ones, kids) are full guest
-- rows. It backfilled the plus_one_name field at the time, but the public
-- RSVP endpoint kept writing to plus_one_name on the head's row rather than
-- creating a companion. Result: plus-ones submitted via the website after
-- that migration never appeared on the seating chart, in the headcount, or
-- anywhere that reads from the guests table.
--
-- This migration sweeps up any plus_one_name values still sitting on head
-- rows and promotes them to companion guest rows, then clears the legacy
-- field. The API change in this same release switches the RSVP endpoint to
-- create companions directly so this won't keep accruing.

with promoted as (
  insert into public.guests (wedding_id, name, party_head_id, role, rsvp_status)
  select
    g.wedding_id,
    trim(g.plus_one_name),
    g.id,
    'plus_one',
    g.rsvp_status
  from public.guests g
  where g.plus_one_name is not null
    and trim(g.plus_one_name) <> ''
    and g.party_head_id is null
    and g.deleted_at is null
    -- Don't double-create a companion if one already exists for this head.
    and not exists (
      select 1
      from public.guests c
      where c.party_head_id = g.id
        and c.deleted_at is null
    )
  returning party_head_id
)
update public.guests
set plus_one = false, plus_one_name = null
where id in (select party_head_id from promoted);
