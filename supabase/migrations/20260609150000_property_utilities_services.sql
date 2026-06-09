-- Per-service utilities capture (electricity, gas) for non-inclusive listings.
-- QLD Form 18a Items 13.1 / 14 / 15 and listing disclosure read via resolvePropertyUtilities().
-- Apply before flipping utilities_resolver_qld_enabled.

alter table public.properties
  add column if not exists utilities_services jsonb null;

comment on column public.properties.utilities_services is
  'Per-service utilities truth for electricity and gas: tenant_pays, individually_metered, apportionment_percent (Item 14, 1–100), how_must_be_paid (Item 15). Null or omitted keys when bills are included in rent.';
