-- Phase 1 foundation: dual-tier pricing model with service tier dimension.
-- Scope intentionally excludes runtime payment consumers and bookings/tenancies schema.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_tier_enum') then
    create type public.service_tier_enum as enum ('listing', 'managed');
  end if;
  if not exists (select 1 from pg_type where typname = 'pricing_fee_mode_enum') then
    create type public.pricing_fee_mode_enum as enum ('percent', 'fixed');
  end if;
end
$$;

alter table public.pricing_config
  add column if not exists property_tier text check (property_tier in ('t1', 't2', 't3')),
  add column if not exists service_tier public.service_tier_enum,
  add column if not exists fee_mode public.pricing_fee_mode_enum,
  add column if not exists fee_percent numeric,
  add column if not exists fee_fixed_cents integer,
  add column if not exists student_fee_mode public.pricing_fee_mode_enum,
  add column if not exists student_fee_percent numeric,
  add column if not exists student_fee_fixed_cents integer,
  add column if not exists utilities_cap_aud integer;

update public.pricing_config
set property_tier = tier
where property_tier is null;

update public.pricing_config
set service_tier = 'managed'
where service_tier is null;

update public.pricing_config
set fee_mode = 'percent'
where fee_mode is null;

update public.pricing_config
set fee_percent = coalesce(svc_fee_pct, 0)
where fee_percent is null;

update public.pricing_config
set fee_fixed_cents = 0
where fee_fixed_cents is null;

update public.pricing_config
set student_fee_mode = 'fixed'
where student_fee_mode is null;

update public.pricing_config
set student_fee_percent = 0
where student_fee_percent is null;

update public.pricing_config
set student_fee_fixed_cents = 0
where student_fee_fixed_cents is null;

update public.pricing_config
set utilities_cap_aud = greatest(0, coalesce(round(utilities_cap)::integer, 0))
where utilities_cap_aud is null;

alter table public.pricing_config
  alter column property_tier set not null,
  alter column service_tier set not null,
  alter column fee_mode set not null,
  alter column fee_percent set not null,
  alter column fee_fixed_cents set not null,
  alter column student_fee_mode set not null,
  alter column student_fee_percent set not null,
  alter column student_fee_fixed_cents set not null,
  alter column utilities_cap_aud set not null;

alter table public.pricing_config
  drop constraint if exists pricing_config_tier_key;

create unique index if not exists pricing_config_property_service_key
  on public.pricing_config(property_tier, service_tier);

alter table public.volume_discount_tiers
  add column if not exists service_tier public.service_tier_enum;

update public.volume_discount_tiers
set service_tier = 'managed'
where service_tier is null;

alter table public.volume_discount_tiers
  alter column service_tier set not null;

alter table public.volume_discount_tiers
  drop constraint if exists volume_discount_tiers_range_key;

create unique index if not exists volume_discount_tiers_service_range_key
  on public.volume_discount_tiers(service_tier, min_rooms, max_rooms);

alter table public.pricing_change_log
  add column if not exists service_tier public.service_tier_enum;

insert into public.pricing_config (
  tier,
  property_tier,
  service_tier,
  svc_fee_pct,
  student_fee_type,
  card_surcharge_enabled,
  free_transfer_required,
  fee_model,
  utilities_cap,
  fee_mode,
  fee_percent,
  fee_fixed_cents,
  student_fee_mode,
  student_fee_percent,
  student_fee_fixed_cents,
  utilities_cap_aud,
  updated_by
)
values
  ('t1', 't1', 'listing', 0, 'none', false, false, 'A', 0, 'fixed', 0, 9900, 'fixed', 0, 0, 0, 'seed_phase1'),
  ('t2', 't2', 'listing', 0, 'none', false, false, 'A', 0, 'fixed', 0, 9900, 'fixed', 0, 0, 0, 'seed_phase1'),
  ('t3', 't3', 'listing', 0, 'none', false, false, 'A', 0, 'fixed', 0, 9900, 'fixed', 0, 0, 0, 'seed_phase1')
on conflict (property_tier, service_tier) do nothing;

update public.pricing_config
set
  fee_mode = 'percent',
  fee_percent = 7,
  fee_fixed_cents = 0,
  student_fee_mode = 'fixed',
  student_fee_percent = 0,
  student_fee_fixed_cents = 0,
  updated_by = coalesce(updated_by, 'phase1_backfill')
where service_tier = 'managed';

insert into public.platform_config (
  config_key,
  config_value,
  label,
  category,
  is_sensitive,
  sort_order
)
values
  ('service_tier_naming', 'managed', 'Managed tier display naming', 'business', false, 900),
  ('quni_service_tier_module_enabled', 'false', 'Enable service tier booking module', 'compliance', false, 910)
on conflict (config_key) do nothing;
