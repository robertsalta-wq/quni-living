-- pricing_config, volume_discount_tiers, pricing_change_log, calculate_landlord_fee
-- Requires: public.landlord_profiles, public.properties, public.set_updated_at(), public.is_platform_admin()
--
-- properties.status: per 20260407140000_remove_property_booked_status.sql the CHECK allows
-- active, inactive, pending, suspended, draft (booked removed; legacy booked rows were set to active).
-- Volume count uses active + booked so tenanted rooms still count if booked is ever restored.

-- ---------------------------------------------------------------------------
-- pricing_config — fee rates per tier (one row per tier)
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  tier text not null
    check (tier in ('t1', 't2', 't3')),
  svc_fee_pct numeric not null,
  student_fee_type text not null
    check (student_fee_type in ('none', 'percent', 'fixed')),
  card_surcharge_enabled boolean not null default false,
  free_transfer_required boolean not null default false,
  fee_model text not null
    check (fee_model in ('A', 'D')),
  utilities_cap numeric not null default 0,
  early_adopter_active boolean not null default false,
  early_adopter_type text
    check (early_adopter_type is null or early_adopter_type in ('free', 'percent', 'fixed')),
  early_adopter_value numeric,
  early_adopter_expiry_type text
    check (
      early_adopter_expiry_type is null
      or early_adopter_expiry_type in ('date', 'count', 'both')
    ),
  early_adopter_expiry_date date,
  early_adopter_expiry_count integer,
  early_adopter_landlords_used integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint pricing_config_tier_key unique (tier)
);

comment on table public.pricing_config is
  'Per-tier fee configuration; source of truth for landlord service fee rules.';
comment on column public.pricing_config.utilities_cap is
  'Quarterly utilities cap in AUD; 0 when not applicable.';
comment on column public.pricing_config.early_adopter_landlords_used is
  'Slots consumed for count-based early adopter expiry; incremented by app logic when a landlord qualifies.';

drop trigger if exists pricing_config_updated_at on public.pricing_config;
create trigger pricing_config_updated_at
  before update on public.pricing_config
  for each row execute function public.set_updated_at();

alter table public.pricing_config enable row level security;

drop policy if exists "Platform admins select pricing_config" on public.pricing_config;
drop policy if exists "Platform admins insert pricing_config" on public.pricing_config;
drop policy if exists "Platform admins update pricing_config" on public.pricing_config;
drop policy if exists "Platform admins delete pricing_config" on public.pricing_config;

create policy "Platform admins select pricing_config"
  on public.pricing_config for select
  using (public.is_platform_admin());

create policy "Platform admins insert pricing_config"
  on public.pricing_config for insert
  with check (public.is_platform_admin());

create policy "Platform admins update pricing_config"
  on public.pricing_config for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete pricing_config"
  on public.pricing_config for delete
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- volume_discount_tiers — volume → service fee %
-- ---------------------------------------------------------------------------
create table if not exists public.volume_discount_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  min_rooms integer not null check (min_rooms >= 0),
  max_rooms integer not null check (max_rooms >= min_rooms),
  discount_rate_pct numeric not null,
  constraint volume_discount_tiers_range_key unique (min_rooms, max_rooms)
);

comment on table public.volume_discount_tiers is
  'Landlord listing volume → service fee percentage (discount_rate_pct is the fee % at that band).';
comment on column public.volume_discount_tiers.max_rooms is
  'Upper inclusive bound; use 999 for unlimited top tier.';

alter table public.volume_discount_tiers enable row level security;

drop policy if exists "Platform admins select volume_discount_tiers" on public.volume_discount_tiers;
drop policy if exists "Platform admins insert volume_discount_tiers" on public.volume_discount_tiers;
drop policy if exists "Platform admins update volume_discount_tiers" on public.volume_discount_tiers;
drop policy if exists "Platform admins delete volume_discount_tiers" on public.volume_discount_tiers;

create policy "Platform admins select volume_discount_tiers"
  on public.volume_discount_tiers for select
  using (public.is_platform_admin());

create policy "Platform admins insert volume_discount_tiers"
  on public.volume_discount_tiers for insert
  with check (public.is_platform_admin());

create policy "Platform admins update volume_discount_tiers"
  on public.volume_discount_tiers for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete volume_discount_tiers"
  on public.volume_discount_tiers for delete
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- pricing_change_log — audit (rows inserted by admin/app on change)
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_change_log (
  id uuid primary key default gen_random_uuid(),
  changed_at timestamptz not null default now(),
  tier text,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by text
);

comment on table public.pricing_change_log is
  'Audit log for pricing changes; populate from admin UI or triggers as needed.';

alter table public.pricing_change_log enable row level security;

drop policy if exists "Platform admins select pricing_change_log" on public.pricing_change_log;
drop policy if exists "Platform admins insert pricing_change_log" on public.pricing_change_log;

create policy "Platform admins select pricing_change_log"
  on public.pricing_change_log for select
  using (public.is_platform_admin());

create policy "Platform admins insert pricing_change_log"
  on public.pricing_change_log for insert
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed: pricing_config
-- ---------------------------------------------------------------------------
insert into public.pricing_config (
  tier,
  svc_fee_pct,
  student_fee_type,
  card_surcharge_enabled,
  free_transfer_required,
  fee_model,
  utilities_cap,
  early_adopter_active,
  early_adopter_type,
  early_adopter_value,
  early_adopter_expiry_type,
  early_adopter_expiry_date,
  early_adopter_expiry_count,
  updated_by
)
values
  (
    't1',
    10,
    'none',
    true,
    false,
    'A',
    0,
    false,
    null,
    null,
    null,
    null,
    null,
    'seed_migration'
  ),
  (
    't2',
    10,
    'none',
    true,
    true,
    'A',
    300,
    false,
    null,
    null,
    null,
    null,
    null,
    'seed_migration'
  ),
  (
    't3',
    10,
    'none',
    false,
    true,
    'A',
    0,
    false,
    null,
    null,
    null,
    null,
    null,
    'seed_migration'
  )
on conflict (tier) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: volume_discount_tiers
-- ---------------------------------------------------------------------------
insert into public.volume_discount_tiers (label, min_rooms, max_rooms, discount_rate_pct)
values
  ('1 room', 1, 1, 10),
  ('2–4 rooms', 2, 4, 9),
  ('5–9 rooms', 5, 9, 8),
  ('10+ rooms', 10, 999, 7)
on conflict (min_rooms, max_rooms) do nothing;

-- ---------------------------------------------------------------------------
-- RPC: calculate_landlord_fee(landlord_id, tier)
-- p_landlord_id = landlord_profiles.id (matches properties.landlord_id FK)
-- ---------------------------------------------------------------------------
create or replace function public.calculate_landlord_fee(
  p_landlord_id uuid,
  p_tier text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg record;
  room_count integer;
  base_rate numeric;
  volume_rate numeric;
  eff_rate numeric;
  ea_rate numeric;
  ea_effective boolean;
  date_ok boolean;
  count_ok boolean;
begin
  if p_landlord_id is null then
    raise exception 'landlord_id required';
  end if;

  if p_tier is null or p_tier not in ('t1', 't2', 't3') then
    raise exception 'invalid tier';
  end if;

  if auth.uid() is not null
     and not public.is_platform_admin()
     and not exists (
       select 1
       from public.landlord_profiles lp
       where lp.id = p_landlord_id
         and lp.user_id = auth.uid()
     ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into strict cfg
  from public.pricing_config c
  where c.tier = p_tier;

  base_rate := cfg.svc_fee_pct;

  select count(*)::integer into room_count
  from public.properties p
  where p.landlord_id = p_landlord_id
    and p.status in ('active', 'booked');

  select v.discount_rate_pct into volume_rate
  from public.volume_discount_tiers v
  where room_count between v.min_rooms and v.max_rooms
  limit 1;

  if volume_rate is null then
    volume_rate := base_rate;
  end if;

  ea_effective := cfg.early_adopter_active;

  if ea_effective then
    if cfg.early_adopter_expiry_type in ('date', 'both') then
      date_ok :=
        cfg.early_adopter_expiry_date is null
        or (current_date <= cfg.early_adopter_expiry_date);
      ea_effective := ea_effective and date_ok;
    end if;

    if ea_effective and cfg.early_adopter_expiry_type in ('count', 'both') then
      count_ok :=
        cfg.early_adopter_expiry_count is null
        or (cfg.early_adopter_landlords_used < cfg.early_adopter_expiry_count);
      ea_effective := ea_effective and count_ok;
    end if;
  end if;

  ea_rate := null;
  eff_rate := volume_rate;

  if ea_effective then
    case cfg.early_adopter_type
      when 'free' then
        ea_rate := 0;
        eff_rate := 0;
      when 'percent' then
        ea_rate := cfg.early_adopter_value;
        eff_rate := cfg.early_adopter_value;
      when 'fixed' then
        ea_rate := cfg.early_adopter_value;
        eff_rate := null;
      else
        ea_effective := false;
        ea_rate := null;
        eff_rate := volume_rate;
    end case;
  end if;

  return jsonb_build_object(
    'base_rate', base_rate,
    'volume_rate', volume_rate,
    'early_adopter_rate', ea_rate,
    'effective_rate', eff_rate,
    'fee_model', cfg.fee_model,
    'early_adopter_active', ea_effective
  );
end;
$$;

comment on function public.calculate_landlord_fee(uuid, text) is
  'Landlord portfolio volume + pricing_config → effective landlord service fee %; EA overrides volume when active and not expired.';

grant execute on function public.calculate_landlord_fee(uuid, text) to authenticated;
grant execute on function public.calculate_landlord_fee(uuid, text) to service_role;
