-- Vendor insurance tracking.

-- Per-vendor insurance status: Not requested -> Requested -> Received.
-- Supersedes the insurance_submitted boolean as the source of truth; the
-- old boolean column is left in place (unused) to avoid breaking callers.
alter table public.vendors
  add column if not exists insurance_status text not null default 'not_requested';

alter table public.vendors
  drop constraint if exists vendors_insurance_status_check;
alter table public.vendors
  add constraint vendors_insurance_status_check
  check (insurance_status in ('not_requested', 'requested', 'received'));

-- Backfill from the old boolean flag.
update public.vendors
  set insurance_status = 'received'
  where insurance_submitted = true and insurance_status = 'not_requested';

-- Tag attachments so insurance certificates can be found apart from
-- contracts and invoices — used by the day-of binder export.
alter table public.attachments
  add column if not exists doc_type text;
