-- Owner-listed vs head-tenant sub-letting/transferring with landlord consent.
-- Drives the head-tenant helper and reactive-audit targeting.

alter table public.properties
  add column if not exists lister_role text not null default 'owner'
    check (lister_role in ('owner', 'head_tenant'));

comment on column public.properties.lister_role is
  'Owner-listed or head-tenant sub-letting/transferring with landlord consent.
   Drives the head-tenant helper and reactive-audit targeting.';

-- Existing rows default to 'owner'; no backfill needed.
