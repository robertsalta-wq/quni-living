-- Water-efficiency precondition attestation for listings that charge water usage separately.
-- Required before asserting water = Yes on prescribed tenancy forms (QLD Form 18a Item 13.2, NSW FT6600, VIC).

alter table public.properties
  add column if not exists water_separately_metered_efficient_attested_at timestamptz null;

comment on column public.properties.water_separately_metered_efficient_attested_at is
  'Timestamp the landlord attested the premises are individually or separately metered for water and meet water-efficiency standards, as required before charging water usage to the tenant. NULL = not attested. Required when water_usage_charged_separately is true.';
