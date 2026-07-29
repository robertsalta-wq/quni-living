-- Duplicate listing: also copy payout bank details, bond weeks/QLD remittance,
-- utilities, FT6600 compliance answers, lister role, and rooms rented.
-- Still nulls availability and creates status draft; does not copy legal listing
-- attestations (authority-to-let / accuracy) — those must be re-confirmed.

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
    p.strata_bylaws_applicable
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
    v_strata_bylaws
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
    strata_bylaws_applicable
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
    v_strata_bylaws
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
  'Landlord-only: draft copy of a listing (images, payout bank details, utilities/compliance, null availability), shared property_group_id when set.';

revoke all on function public.duplicate_property_listing(uuid) from public;
grant execute on function public.duplicate_property_listing(uuid) to authenticated;
