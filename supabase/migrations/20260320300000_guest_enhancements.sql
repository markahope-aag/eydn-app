-- Add role and address fields to guests
alter table public.guests
  add column role text default 'friend' check (role in ('family', 'friend', 'wedding_party', 'coworker', 'plus_one', 'other')),
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column state text,
  add column zip text;

-- Update rsvp_status to include invite_sent
alter table public.guests drop constraint if exists guests_rsvp_status_check;
alter table public.guests add constraint guests_rsvp_status_check
  check (rsvp_status in ('not_invited', 'invite_sent', 'pending', 'accepted', 'declined'));

-- Set existing pending guests to not_invited (they haven't been sent invites yet)
update public.guests set rsvp_status = 'not_invited' where rsvp_status = 'pending';
