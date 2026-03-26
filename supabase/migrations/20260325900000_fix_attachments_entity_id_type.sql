-- Fix: entity_id was uuid, but synthetic uploads use text IDs like
-- 'wedding-party-photo', 'mood-board', 'website-cover', etc.
-- Change to text to support both UUID references and synthetic IDs.
alter table public.attachments
  alter column entity_id type text using entity_id::text;
