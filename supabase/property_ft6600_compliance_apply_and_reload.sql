-- Run once in Supabase Dashboard → SQL Editor (same project as production VITE_SUPABASE_URL).
-- Safe to re-run: adds missing columns, then reloads the PostgREST schema cache.

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

-- Confirm columns exist (should return 10 rows):
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name in (
    'smoke_alarm_type',
    'smoke_alarm_battery_tenant_replaceable',
    'smoke_alarm_battery_type',
    'smoke_alarm_backup_tenant_replaceable',
    'smoke_alarm_backup_battery_type',
    'strata_oc_responsible_for_alarms',
    'water_usage_charged_separately',
    'electricity_embedded_network',
    'gas_embedded_network',
    'strata_bylaws_applicable'
  )
order by column_name;

-- Reload API schema cache (fixes "Could not find column … in the schema cache" after DDL).
notify pgrst, 'reload schema';
