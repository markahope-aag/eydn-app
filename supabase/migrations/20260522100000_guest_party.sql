-- Guest "party" support: a guest can have additional people (children,
-- plus-ones) attending with them, captured as full guest rows linked to
-- a head guest via party_head_id.

alter table public.guests
  add column if not exists party_head_id uuid references public.guests(id) on delete set null;

create index if not exists guests_party_head_id_idx on public.guests(party_head_id);

-- Migrate existing single plus-ones into full companion guest rows so the
-- party model becomes the single source of truth. INSERT ... SELECT sees a
-- snapshot, so the new rows are not re-processed by this statement.
insert into public.guests (wedding_id, name, party_head_id, role, rsvp_status)
select g.wedding_id, trim(g.plus_one_name), g.id, 'plus_one', g.rsvp_status
from public.guests g
where g.plus_one = true
  and g.plus_one_name is not null
  and trim(g.plus_one_name) <> ''
  and g.party_head_id is null
  and g.deleted_at is null;

-- Clear the now-migrated single plus-one fields on the head rows.
update public.guests
set plus_one = false, plus_one_name = null
where plus_one = true
  and party_head_id is null
  and deleted_at is null;
