-- Victorian rooming house listing facts, operator attestation, and fee-tier routing.
-- Not applied by the agent. Rob runs this on Quni-Living-AU.
--
-- Callers of resolve_property_tier_from_listing updated in this file, then the
-- (text, boolean) overload is dropped:
--   public.trg_properties_seed_fee_snapshots()
--   public.admin_reset_property_fee_snapshots_from_template(uuid, text)
-- No other live caller exists in the repo. The two-argument calls in
-- 20260507100000_property_fee_snapshots.sql are the one-off backfill insert.

alter table public.properties
  add column if not exists vic_rooming_house_operator_licence_number text null,
  add column if not exists vic_rooming_house_rules text null,
  add column if not exists vic_rooming_items_let_with_room text null,
  add column if not exists vic_rooming_operator_accepts_electronic_service boolean null,
  add column if not exists vic_rooming_pay_direct_debit boolean not null default false,
  add column if not exists vic_rooming_pay_bank_deposit boolean not null default false,
  add column if not exists vic_rooming_pay_cash boolean not null default false,
  add column if not exists vic_rooming_pay_cheque boolean not null default false,
  add column if not exists vic_rooming_pay_bpay boolean not null default false,
  add column if not exists vic_rooming_pay_other_eft boolean not null default false,
  add column if not exists vic_premises_occupant_capacity integer null;

alter table public.properties
  drop constraint if exists properties_vic_premises_occupant_capacity_check;
alter table public.properties
  add constraint properties_vic_premises_occupant_capacity_check
  check (
    vic_premises_occupant_capacity is null
    or vic_premises_occupant_capacity between 1 and 99
  );

comment on column public.properties.vic_rooming_house_operator_licence_number is
  'Rooming House Operators Act 2016 (Vic) licence number. Required to publish a Victorian rooming house listing.';
comment on column public.properties.vic_rooming_house_rules is
  'Operator-written Victorian rooming house rules. Not Queensland Schedule 7 and not marketing house_rules.';
comment on column public.properties.vic_rooming_items_let_with_room is
  'Printed as entered in Items let with the room on the rooming house agreement. Optional.';
comment on column public.properties.vic_rooming_operator_accepts_electronic_service is
  'Item 9.1. Null until the operator answers. The agreement is not sent while null.';
comment on column public.properties.vic_rooming_pay_other_eft is
  'Item 8 tick for other electronic payment, including Centrepay. No biller code is stored. Payment details print the bank account only when bank deposit is ticked.';
comment on column public.properties.vic_rooming_pay_bpay is
  'Item 8 BPAY tick. No biller code is stored. Payment details print the bank account only when bank deposit is ticked.';
comment on column public.properties.vic_premises_occupant_capacity is
  'Maximum people who can live in the building, including the owner if they live there. Required before a Victorian listing can be published. Not max_occupants.';
comment on column public.properties.room_description is
  'Room identifier printed on the agreement. NSW T3 occupancy agreement and VIC rooming house agreement room number.';
comment on column public.properties.is_registered_rooming_house is
  'Operator says this building is a registered rooming house. NSW routing still uses it. VIC routing does not. Kept because the Victorian land tax exemption needs it.';

alter table public.bookings
  add column if not exists vic_rooming_house_rules_attested_at timestamptz null,
  add column if not exists vic_rooming_resident_accepts_electronic_service boolean null,
  add column if not exists vic_rooming_condition_report text null;

alter table public.bookings
  drop constraint if exists bookings_vic_rooming_condition_report_check;
alter table public.bookings
  add constraint bookings_vic_rooming_condition_report_check
  check (
    vic_rooming_condition_report is null
    or vic_rooming_condition_report in ('provided', 'will_be_provided')
  );

comment on column public.bookings.vic_rooming_house_rules_attested_at is
  'When the resident signed the generated Victorian house rules PDF. Null until that signature is complete.';
comment on column public.bookings.vic_rooming_resident_accepts_electronic_service is
  'Item 9.2. Null until the resident ticks yes or no at signing. Never defaulted.';
comment on column public.bookings.vic_rooming_condition_report is
  'Item 12 tick for this resident at this move-in: provided, or will_be_provided on or before the start date. Set when the landlord accepts the booking. Required before the agreement generates.';


create or replace function public.duplicate_property_listing(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_landlord_id uuid;
  v_source_id uuid;
  v_group uuid;
  v_new_id uuid := gen_random_uuid();
  v_slug text;
  v_base text;
  v_suffix text;
  v_attempt int := 0;
  v_title text;
  v_description text;
  v_rent numeric;
  v_room_type text;
  v_bedrooms int;
  v_bathrooms int;
  v_furnished boolean;
  v_bond numeric;
  v_bond_weeks int;
  v_qld_bond_remittance text;
  v_lease_length text;
  v_listing_type text;
  v_featured boolean;
  v_address text;
  v_suburb text;
  v_state text;
  v_postcode text;
  v_latitude double precision;
  v_longitude double precision;
  v_landlord_id_prop uuid;
  v_university_id uuid;
  v_campus_id uuid;
  v_linen boolean;
  v_cleaning boolean;
  v_property_type text;
  v_open_non_students boolean;
  v_show_add_uni boolean;
  v_rooming boolean;
  v_rooming_num text;
  v_house_rules text;
  v_service_tier text;
  v_max_occ int;
  v_couple numeric;
  v_parking numeric;
  v_parking_avail boolean;
  v_images text[];
  v_rooms_rented int;
  v_lister_role text;
  v_utilities_services jsonb;
  v_water_usage boolean;
  v_smoke_alarm_type text;
  v_smoke_battery_replaceable boolean;
  v_smoke_battery_type text;
  v_smoke_backup_replaceable boolean;
  v_smoke_backup_type text;
  v_strata_oc boolean;
  v_electricity_embedded boolean;
  v_gas_embedded boolean;
  v_strata_bylaws boolean;
  v_room_description text;
  v_vic_licence text;
  v_vic_rules text;
  v_vic_items text;
  v_vic_operator_eservice boolean;
  v_vic_pay_direct_debit boolean;
  v_vic_pay_bank_deposit boolean;
  v_vic_pay_cash boolean;
  v_vic_pay_cheque boolean;
  v_vic_pay_bpay boolean;
  v_vic_pay_other_eft boolean;
  v_vic_capacity integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select lp.id into v_landlord_id
  from public.landlord_profiles lp
  where lp.user_id = v_user_id;

  if v_landlord_id is null then
    raise exception 'not a landlord';
  end if;

  select
    p.id,
    p.property_group_id,
    p.title,
    p.description,
    p.rent_per_week,
    p.room_type::text,
    p.bedrooms,
    p.bathrooms,
    p.furnished,
    p.bond,
    p.bond_weeks,
    p.qld_bond_remittance_preference::text,
    p.lease_length,
    p.listing_type::text,
    p.featured,
    p.address,
    p.suburb,
    p.state,
    p.postcode,
    p.latitude,
    p.longitude,
    p.landlord_id,
    p.university_id,
    p.campus_id,
    p.linen_supplied,
    p.weekly_cleaning_service,
    p.property_type,
    p.open_to_non_students,
    coalesce(p.show_add_another_university, false),
    coalesce(p.is_registered_rooming_house, false),
    p.rooming_house_registration_number,
    p.house_rules,
    coalesce(p.service_tier, 'managed'),
    coalesce(p.max_occupants, 1),
    p.couple_surcharge_per_week,
    p.parking_surcharge_per_week,
    coalesce(p.parking_available, false),
    coalesce(p.images, '{}'::text[]),
    p.rooms_rented_to_residents,
    p.lister_role::text,
    p.utilities_services,
    p.water_usage_charged_separately,
    p.smoke_alarm_type::text,
    p.smoke_alarm_battery_tenant_replaceable,
    p.smoke_alarm_battery_type,
    p.smoke_alarm_backup_tenant_replaceable,
    p.smoke_alarm_backup_battery_type,
    p.strata_oc_responsible_for_alarms,
    p.electricity_embedded_network,
    p.gas_embedded_network,
    p.strata_bylaws_applicable,
    p.room_description,
    p.vic_rooming_house_operator_licence_number,
    p.vic_rooming_house_rules,
    p.vic_rooming_items_let_with_room,
    p.vic_rooming_operator_accepts_electronic_service,
    p.vic_rooming_pay_direct_debit,
    p.vic_rooming_pay_bank_deposit,
    p.vic_rooming_pay_cash,
    p.vic_rooming_pay_cheque,
    p.vic_rooming_pay_bpay,
    p.vic_rooming_pay_other_eft,
    p.vic_premises_occupant_capacity
  into
    v_source_id,
    v_group,
    v_title,
    v_description,
    v_rent,
    v_room_type,
    v_bedrooms,
    v_bathrooms,
    v_furnished,
    v_bond,
    v_bond_weeks,
    v_qld_bond_remittance,
    v_lease_length,
    v_listing_type,
    v_featured,
    v_address,
    v_suburb,
    v_state,
    v_postcode,
    v_latitude,
    v_longitude,
    v_landlord_id_prop,
    v_university_id,
    v_campus_id,
    v_linen,
    v_cleaning,
    v_property_type,
    v_open_non_students,
    v_show_add_uni,
    v_rooming,
    v_rooming_num,
    v_house_rules,
    v_service_tier,
    v_max_occ,
    v_couple,
    v_parking,
    v_parking_avail,
    v_images,
    v_rooms_rented,
    v_lister_role,
    v_utilities_services,
    v_water_usage,
    v_smoke_alarm_type,
    v_smoke_battery_replaceable,
    v_smoke_battery_type,
    v_smoke_backup_replaceable,
    v_smoke_backup_type,
    v_strata_oc,
    v_electricity_embedded,
    v_gas_embedded,
    v_strata_bylaws,
    v_room_description,
    v_vic_licence,
    v_vic_rules,
    v_vic_items,
    v_vic_operator_eservice,
    v_vic_pay_direct_debit,
    v_vic_pay_bank_deposit,
    v_vic_pay_cash,
    v_vic_pay_cheque,
    v_vic_pay_bpay,
    v_vic_pay_other_eft,
    v_vic_capacity
  from public.properties p
  where p.id = p_source_id
    and p.landlord_id = v_landlord_id;

  if v_source_id is null then
    raise exception 'property not found';
  end if;

  if v_group is null then
    v_group := gen_random_uuid();
    update public.properties set property_group_id = v_group where id = v_source_id;
  end if;

  v_base := lower(trim(v_title));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '^-+|-+$', '', 'g');
  v_base := left(coalesce(nullif(v_base, ''), 'listing'), 80);

  loop
    v_suffix := substr(md5(random()::text || clock_timestamp()::text || v_attempt::text), 1, 5);
    v_slug := v_base || '-' || v_suffix;
    exit when not exists (select 1 from public.properties x where x.slug = v_slug);
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'could not allocate unique slug';
    end if;
  end loop;

  insert into public.properties (
    id,
    title,
    slug,
    description,
    rent_per_week,
    room_type,
    images,
    bedrooms,
    bathrooms,
    furnished,
    bond,
    bond_weeks,
    qld_bond_remittance_preference,
    lease_length,
    listing_type,
    featured,
    address,
    suburb,
    state,
    postcode,
    latitude,
    longitude,
    landlord_id,
    university_id,
    campus_id,
    available_from,
    available_to,
    status,
    created_at,
    updated_at,
    linen_supplied,
    weekly_cleaning_service,
    property_type,
    open_to_non_students,
    show_add_another_university,
    property_group_id,
    is_registered_rooming_house,
    rooming_house_registration_number,
    house_rules,
    service_tier,
    max_occupants,
    couple_surcharge_per_week,
    parking_surcharge_per_week,
    parking_available,
    rooms_rented_to_residents,
    lister_role,
    utilities_services,
    water_usage_charged_separately,
    smoke_alarm_type,
    smoke_alarm_battery_tenant_replaceable,
    smoke_alarm_battery_type,
    smoke_alarm_backup_tenant_replaceable,
    smoke_alarm_backup_battery_type,
    strata_oc_responsible_for_alarms,
    electricity_embedded_network,
    gas_embedded_network,
    strata_bylaws_applicable,
    room_description,
    vic_rooming_house_operator_licence_number,
    vic_rooming_house_rules,
    vic_rooming_items_let_with_room,
    vic_rooming_operator_accepts_electronic_service,
    vic_rooming_pay_direct_debit,
    vic_rooming_pay_bank_deposit,
    vic_rooming_pay_cash,
    vic_rooming_pay_cheque,
    vic_rooming_pay_bpay,
    vic_rooming_pay_other_eft,
    vic_premises_occupant_capacity
  ) values (
    v_new_id,
    v_title,
    v_slug,
    v_description,
    v_rent,
    v_room_type,
    v_images,
    v_bedrooms,
    v_bathrooms,
    v_furnished,
    v_bond,
    coalesce(v_bond_weeks, 4),
    v_qld_bond_remittance,
    v_lease_length,
    v_listing_type,
    v_featured,
    v_address,
    v_suburb,
    v_state,
    v_postcode,
    v_latitude,
    v_longitude,
    v_landlord_id_prop,
    v_university_id,
    v_campus_id,
    null,
    null,
    'draft',
    now(),
    now(),
    v_linen,
    v_cleaning,
    v_property_type,
    coalesce(v_open_non_students, false),
    v_show_add_uni,
    v_group,
    v_rooming,
    v_rooming_num,
    v_house_rules,
    v_service_tier,
    v_max_occ,
    v_couple,
    v_parking,
    v_parking_avail,
    v_rooms_rented,
    coalesce(v_lister_role, 'owner'),
    v_utilities_services,
    v_water_usage,
    v_smoke_alarm_type,
    v_smoke_battery_replaceable,
    v_smoke_battery_type,
    v_smoke_backup_replaceable,
    v_smoke_backup_type,
    v_strata_oc,
    v_electricity_embedded,
    v_gas_embedded,
    v_strata_bylaws,
    v_room_description,
    v_vic_licence,
    v_vic_rules,
    v_vic_items,
    v_vic_operator_eservice,
    coalesce(v_vic_pay_direct_debit, false),
    coalesce(v_vic_pay_bank_deposit, false),
    coalesce(v_vic_pay_cash, false),
    coalesce(v_vic_pay_cheque, false),
    coalesce(v_vic_pay_bpay, false),
    coalesce(v_vic_pay_other_eft, false),
    v_vic_capacity
  );

  insert into public.property_features (property_id, feature_id)
  select v_new_id, pf.feature_id
  from public.property_features pf
  where pf.property_id = v_source_id
  on conflict do nothing;

  if to_regclass('public.property_house_rules') is not null then
    insert into public.property_house_rules (property_id, rule_id, permitted)
    select v_new_id, phr.rule_id, phr.permitted
    from public.property_house_rules phr
    where phr.property_id = v_source_id
    on conflict do nothing;
  end if;

  if to_regclass('public.property_payout_details') is not null then
    insert into public.property_payout_details (
      property_id,
      account_name,
      bsb,
      account_number
    )
    select
      v_new_id,
      ppd.account_name,
      ppd.bsb,
      ppd.account_number
    from public.property_payout_details ppd
    where ppd.property_id = v_source_id
    on conflict (property_id) do nothing;
  end if;

  return v_new_id;
end;
$$;

comment on function public.duplicate_property_listing(uuid) is
  'Landlord-only: draft copy of a listing (images, payout bank details, utilities/compliance, room number, Victorian rooming fields, null availability), shared property_group_id when set. Does not copy operator attestations.';

revoke all on function public.duplicate_property_listing(uuid) from public;
grant execute on function public.duplicate_property_listing(uuid) to authenticated;


-- Four-argument function is created while the two-argument function still exists.
-- No statement below calls the two-argument form. Callers are replaced, then it is dropped.

create or replace function public.resolve_property_tier_from_listing(
  p_property_type text,
  p_is_registered_rooming_house boolean,
  p_state text,
  p_premises_occupant_capacity integer
)
returns text
language sql
immutable
as $$
  select case
    when upper(trim(coalesce(p_state, ''))) = 'VIC' then
      case
        when trim(coalesce(p_property_type, '')) = 'private_room_landlord_on_site' then 't1'
        when trim(coalesce(p_property_type, '')) in (
          'private_room_landlord_off_site',
          'shared_room'
        ) and p_premises_occupant_capacity >= 4 then 't3'
        else 't2'
      end
    when trim(coalesce(p_property_type, '')) = 'private_room_landlord_on_site' then 't1'
    when trim(coalesce(p_property_type, '')) = 'private_room_landlord_off_site'
      and coalesce(p_is_registered_rooming_house, false) then 't3'
    else 't2'
  end;
$$;

create or replace function public.trg_properties_seed_fee_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tier text;
begin
  tier := public.resolve_property_tier_from_listing(
    new.property_type::text,
    new.is_registered_rooming_house,
    new.state,
    new.vic_premises_occupant_capacity
  );
  perform public.seed_property_fee_snapshots_from_pricing_config(
    new.id,
    tier,
    'listing_creation'::public.property_fee_snapshot_source,
    auth.uid(),
    null
  );
  return new;
end;
$$;

create or replace function public.admin_reset_property_fee_snapshots_from_template(
  p_property_id uuid,
  p_change_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tier text;
  v_reason text := trim(p_change_reason);
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;
  if v_reason is null or length(v_reason) = 0 then
    raise exception 'change_reason required';
  end if;

  select public.resolve_property_tier_from_listing(
    property_type::text,
    is_registered_rooming_house,
    state,
    vic_premises_occupant_capacity
  )
  into tier
  from public.properties
  where id = p_property_id;

  if tier is null then
    raise exception 'property not found';
  end if;

  update public.property_fee_snapshots
  set is_active = false
  where property_id = p_property_id
    and is_active = true;

  perform public.seed_property_fee_snapshots_from_pricing_config(
    p_property_id,
    tier,
    'admin_override'::public.property_fee_snapshot_source,
    auth.uid(),
    v_reason
  );
end;
$$;

create or replace function public.trg_properties_reseed_fee_snapshots_on_tier_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_tier text;
  new_tier text;
begin
  old_tier := public.resolve_property_tier_from_listing(
    old.property_type::text,
    old.is_registered_rooming_house,
    old.state,
    old.vic_premises_occupant_capacity
  );
  new_tier := public.resolve_property_tier_from_listing(
    new.property_type::text,
    new.is_registered_rooming_house,
    new.state,
    new.vic_premises_occupant_capacity
  );
  if old_tier is not distinct from new_tier then
    return new;
  end if;
  if exists (
    select 1
    from public.property_fee_snapshots s
    where s.property_id = new.id
      and s.is_active
      and s.snapshot_source is distinct from 'listing_creation'
  ) then
    return new;
  end if;

  update public.property_fee_snapshots
  set is_active = false
  where property_id = new.id
    and is_active;

  perform public.seed_property_fee_snapshots_from_pricing_config(
    new.id,
    new_tier,
    'listing_creation'::public.property_fee_snapshot_source,
    auth.uid(),
    'tier changed'
  );
  return new;
end;
$$;

drop trigger if exists properties_reseed_fee_snapshots_on_tier_change on public.properties;
create trigger properties_reseed_fee_snapshots_on_tier_change
  after update on public.properties
  for each row
  execute function public.trg_properties_reseed_fee_snapshots_on_tier_change();

drop function if exists public.resolve_property_tier_from_listing(text, boolean);

create table if not exists public.property_vic_rooming_operator_attestations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid null,
  property_id_at_attestation uuid not null,
  attested_by uuid not null references auth.users (id),
  attested_at timestamptz not null default now(),
  registration_number text not null,
  operator_licence_number text not null,
  registration_current_declared boolean not null,
  licence_current_declared boolean not null,
  warranty_version text not null,
  premises_address text null,
  premises_suburb text null,
  premises_state text null,
  premises_postcode text null,
  superseded_at timestamptz null,
  constraint property_vic_rooming_operator_attestations_both_current
    check (registration_current_declared and licence_current_declared)
);

alter table public.property_vic_rooming_operator_attestations
  drop constraint if exists property_vic_rooming_operator_attestations_property_id_fkey;
alter table public.property_vic_rooming_operator_attestations
  add constraint property_vic_rooming_operator_attestations_property_id_fkey
  foreign key (property_id) references public.properties (id) on delete set null;

comment on table public.property_vic_rooming_operator_attestations is
  'Append-only Victorian rooming house operator attestation. Current row has superseded_at null. Survives property delete. Quni records the declaration and does not verify council registration or the operator licence.';

create unique index if not exists property_vic_rooming_operator_attestations_one_current_idx
  on public.property_vic_rooming_operator_attestations (property_id)
  where superseded_at is null;

alter table public.property_vic_rooming_operator_attestations enable row level security;

drop policy if exists "Landlords select own VIC rooming operator attestations"
  on public.property_vic_rooming_operator_attestations;
create policy "Landlords select own VIC rooming operator attestations"
  on public.property_vic_rooming_operator_attestations
  for select
  to authenticated
  using (
    property_id in (
      select p.id
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  );

drop policy if exists "Platform admins select VIC rooming operator attestations"
  on public.property_vic_rooming_operator_attestations;
create policy "Platform admins select VIC rooming operator attestations"
  on public.property_vic_rooming_operator_attestations
  for select
  to authenticated
  using (public.is_platform_admin());

revoke all on table public.property_vic_rooming_operator_attestations from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.property_vic_rooming_operator_attestations
  from authenticated;
revoke insert, update, delete, truncate
  on table public.property_vic_rooming_operator_attestations
  from service_role;
grant select on table public.property_vic_rooming_operator_attestations to authenticated;
grant select on table public.property_vic_rooming_operator_attestations to service_role;

create or replace function public.trg_property_vic_rooming_operator_attestations_stamp_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_addr text;
  v_suburb text;
  v_state text;
  v_postcode text;
begin
  if auth.uid() is null then
    raise exception 'property_vic_rooming_operator_attestations.attested_by required'
      using errcode = 'check_violation';
  end if;

  new.attested_by := auth.uid();
  new.attested_at := now();
  new.superseded_at := null;

  if new.property_id is null then
    raise exception 'property_vic_rooming_operator_attestations.property_id required on insert'
      using errcode = 'check_violation';
  end if;

  new.property_id_at_attestation := new.property_id;

  select p.address, p.suburb, p.state, p.postcode
  into v_addr, v_suburb, v_state, v_postcode
  from public.properties p
  where p.id = new.property_id;

  if not found then
    raise exception 'property_vic_rooming_operator_attestations insert: property % not found', new.property_id
      using errcode = 'foreign_key_violation';
  end if;

  if upper(trim(coalesce(v_state, ''))) is distinct from 'VIC' then
    raise exception 'Victorian rooming operator attestation requires a VIC property'
      using errcode = 'check_violation';
  end if;

  new.premises_address := v_addr;
  new.premises_suburb := v_suburb;
  new.premises_state := v_state;
  new.premises_postcode := v_postcode;

  return new;
end;
$$;

drop trigger if exists property_vic_rooming_operator_attestations_stamp_insert
  on public.property_vic_rooming_operator_attestations;
create trigger property_vic_rooming_operator_attestations_stamp_insert
  before insert on public.property_vic_rooming_operator_attestations
  for each row
  execute function public.trg_property_vic_rooming_operator_attestations_stamp_insert();

create or replace function public.trg_property_vic_rooming_operator_attestations_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'property_vic_rooming_operator_attestations is append-only (DELETE forbidden)'
      using errcode = 'restrict_violation';
  end if;

  if old.superseded_at is null
     and new.superseded_at is not null
     and new.id is not distinct from old.id
     and new.property_id is not distinct from old.property_id
     and new.property_id_at_attestation is not distinct from old.property_id_at_attestation
     and new.attested_by is not distinct from old.attested_by
     and new.attested_at is not distinct from old.attested_at
     and new.registration_number is not distinct from old.registration_number
     and new.operator_licence_number is not distinct from old.operator_licence_number
     and new.registration_current_declared is not distinct from old.registration_current_declared
     and new.licence_current_declared is not distinct from old.licence_current_declared
     and new.warranty_version is not distinct from old.warranty_version
     and new.premises_address is not distinct from old.premises_address
     and new.premises_suburb is not distinct from old.premises_suburb
     and new.premises_state is not distinct from old.premises_state
     and new.premises_postcode is not distinct from old.premises_postcode
  then
    new.superseded_at := now();
    return new;
  end if;

  if old.property_id is not null
     and new.property_id is null
     and new.id is not distinct from old.id
     and new.property_id_at_attestation is not distinct from old.property_id_at_attestation
     and new.attested_by is not distinct from old.attested_by
     and new.attested_at is not distinct from old.attested_at
     and new.registration_number is not distinct from old.registration_number
     and new.operator_licence_number is not distinct from old.operator_licence_number
     and new.registration_current_declared is not distinct from old.registration_current_declared
     and new.licence_current_declared is not distinct from old.licence_current_declared
     and new.warranty_version is not distinct from old.warranty_version
     and new.superseded_at is not distinct from old.superseded_at
     and new.premises_address is not distinct from old.premises_address
     and new.premises_suburb is not distinct from old.premises_suburb
     and new.premises_state is not distinct from old.premises_state
     and new.premises_postcode is not distinct from old.premises_postcode
  then
    return new;
  end if;

  raise exception 'property_vic_rooming_operator_attestations is append-only (UPDATE forbidden except supersede or parent SET NULL)'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists property_vic_rooming_operator_attestations_append_only
  on public.property_vic_rooming_operator_attestations;
create trigger property_vic_rooming_operator_attestations_append_only
  before update or delete on public.property_vic_rooming_operator_attestations
  for each row
  execute function public.trg_property_vic_rooming_operator_attestations_append_only();

drop trigger if exists property_vic_rooming_operator_attestations_no_truncate
  on public.property_vic_rooming_operator_attestations;
create trigger property_vic_rooming_operator_attestations_no_truncate
  before truncate on public.property_vic_rooming_operator_attestations
  for each statement
  execute function public.trg_forbid_truncate();

create or replace function public.record_property_vic_rooming_operator_attestation(
  p_property_id uuid,
  p_registration_number text,
  p_operator_licence_number text,
  p_registration_current_declared boolean,
  p_licence_current_declared boolean,
  p_warranty_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_landlord_id uuid;
  v_state text;
  v_reg text := trim(coalesce(p_registration_number, ''));
  v_licence text := trim(coalesce(p_operator_licence_number, ''));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_property_id is null then
    raise exception 'property_id required';
  end if;

  select lp.id
  into v_landlord_id
  from public.landlord_profiles lp
  where lp.user_id = v_user_id;
  if v_landlord_id is null then
    raise exception 'not a landlord';
  end if;

  select p.state
  into v_state
  from public.properties p
  where p.id = p_property_id
    and p.landlord_id = v_landlord_id;

  if not found then
    raise exception 'property not found';
  end if;

  if upper(trim(coalesce(v_state, ''))) is distinct from 'VIC' then
    raise exception 'Victorian rooming operator attestation requires a VIC property';
  end if;

  if length(v_reg) = 0 then
    raise exception 'registration_number required';
  end if;
  if length(v_licence) = 0 then
    raise exception 'operator_licence_number required';
  end if;
  if p_registration_current_declared is not true
     or p_licence_current_declared is not true then
    raise exception 'both declarations must be current';
  end if;
  if coalesce(p_warranty_version, '') is distinct from 'vic-rooming-operator-attestation-v1' then
    raise exception 'warranty_version must be vic-rooming-operator-attestation-v1';
  end if;

  perform 1
  from public.property_vic_rooming_operator_attestations a
  where a.property_id = p_property_id
    and a.superseded_at is null
  for update;

  update public.property_vic_rooming_operator_attestations
  set superseded_at = now()
  where property_id = p_property_id
    and superseded_at is null;

  insert into public.property_vic_rooming_operator_attestations (
    property_id,
    registration_number,
    operator_licence_number,
    registration_current_declared,
    licence_current_declared,
    warranty_version
  ) values (
    p_property_id,
    v_reg,
    v_licence,
    true,
    true,
    'vic-rooming-operator-attestation-v1'
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.record_property_vic_rooming_operator_attestation is
  'Atomic supersede-then-insert for Victorian rooming operator attestations. Stamp trigger sets attested_by, attested_at, property_id_at_attestation, and the premises snapshot. Rejects a property whose state is not VIC.';

revoke all on function public.record_property_vic_rooming_operator_attestation(
  uuid, text, text, boolean, boolean, text
) from public, anon;
grant execute on function public.record_property_vic_rooming_operator_attestation(
  uuid, text, text, boolean, boolean, text
) to authenticated;
