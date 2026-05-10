-- Per-property service tier selection. Existing listings default to Managed.

alter table public.properties
  add column if not exists service_tier text not null default 'managed'
    check (service_tier in ('listing', 'managed'));

comment on column public.properties.service_tier is
  'Per-property Quni service tier. Listing is self-managed by the landlord; Managed is Quni-managed. Listing may be upgraded to Managed, but Managed is not downgraded.';
