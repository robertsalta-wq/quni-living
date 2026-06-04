-- NSW FT6600 schedule property compliance fields (landlord-entered per listing).
-- Max occupants on the agreement is sourced from bookings.occupant_count, not here.

alter table public.properties
  add column if not exists smoke_alarm_type text,
  add column if not exists smoke_alarm_battery_tenant_replaceable boolean,
  add column if not exists smoke_alarm_battery_type text,
  add column if not exists smoke_alarm_backup_tenant_replaceable boolean,
  add column if not exists smoke_alarm_backup_battery_type text,
  add column if not exists strata_oc_responsible_for_alarms boolean,
  add column if not exists water_usage_charged_separately boolean,
  add column if not exists electricity_embedded_network boolean,
  add column if not exists gas_embedded_network boolean,
  add column if not exists strata_bylaws_applicable boolean;

alter table public.properties
  drop constraint if exists properties_smoke_alarm_type_check;

alter table public.properties
  add constraint properties_smoke_alarm_type_check
  check (smoke_alarm_type is null or smoke_alarm_type in ('hardwired', 'battery'));

comment on column public.properties.smoke_alarm_type is
  'NSW FT6600: hardwired or battery-operated smoke alarms in the residential premises.';

comment on column public.properties.smoke_alarm_battery_tenant_replaceable is
  'NSW FT6600 (battery alarms): tenant may replace batteries.';

comment on column public.properties.smoke_alarm_battery_type is
  'NSW FT6600 (battery alarms): battery type when tenant-replaceable is true.';

comment on column public.properties.smoke_alarm_backup_tenant_replaceable is
  'NSW FT6600 (hardwired alarms): tenant may replace backup batteries.';

comment on column public.properties.smoke_alarm_backup_battery_type is
  'NSW FT6600 (hardwired alarms): backup battery type when tenant-replaceable is true.';

comment on column public.properties.strata_oc_responsible_for_alarms is
  'NSW FT6600: owners corporation responsible for smoke alarm repair/replacement (strata).';

comment on column public.properties.water_usage_charged_separately is
  'NSW FT6600: water usage charged separately to the tenant.';

comment on column public.properties.electricity_embedded_network is
  'NSW FT6600: electricity supplied via an embedded network.';

comment on column public.properties.gas_embedded_network is
  'NSW FT6600: gas supplied via an embedded network.';

comment on column public.properties.strata_bylaws_applicable is
  'NSW FT6600: strata or community scheme by-laws apply to the premises.';

notify pgrst, 'reload schema';
