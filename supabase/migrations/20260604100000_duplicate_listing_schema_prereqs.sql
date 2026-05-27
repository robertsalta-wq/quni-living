-- Production skipped 20260403120000 (and possibly other) migrations. duplicate_property_listing
-- failed with: record "r" has no field "property_group_id". Apply prerequisites + hardened RPC.

-- ---------------------------------------------------------------------------
-- properties columns required by duplicate_property_listing
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists property_group_id uuid;

comment on column public.properties.property_group_id is
  'Optional stable id shared by listings for the same physical address; used when duplicating rooms.';

alter table public.properties
  add column if not exists show_add_another_university boolean default false;

alter table public.properties
  add column if not exists available_from date;

alter table public.properties
  add column if not exists available_to date;

alter table public.properties
  add column if not exists open_to_non_students boolean default false;

alter table public.properties
  add column if not exists is_registered_rooming_house boolean default false;

alter table public.properties
  add column if not exists rooming_house_registration_number text;

alter table public.properties
  add column if not exists house_rules text;

alter table public.properties
  add column if not exists service_tier text;

update public.properties
set service_tier = 'managed'
where service_tier is null;

alter table public.properties
  alter column service_tier set default 'managed';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'service_tier'
      and is_nullable = 'YES'
  ) then
    alter table public.properties
      alter column service_tier set not null;
  end if;
exception
  when others then
    null;
end $$;

alter table public.properties
  add column if not exists max_occupants integer;

alter table public.properties
  add column if not exists couple_surcharge_per_week numeric(10, 2);

alter table public.properties
  add column if not exists parking_surcharge_per_week numeric(10, 2);

alter table public.properties
  add column if not exists parking_available boolean;

update public.properties set max_occupants = 1 where max_occupants is null;
update public.properties set parking_available = false where parking_available is null;

alter table public.properties
  alter column max_occupants set default 1;

alter table public.properties
  alter column parking_available set default false;

-- Allow draft copies from duplicate (idempotent).
alter table public.properties drop constraint if exists properties_status_check;

alter table public.properties
  add constraint properties_status_check
  check (
    status in ('active', 'inactive', 'pending', 'suspended', 'draft', 'booked')
  );

-- ---------------------------------------------------------------------------
-- duplicate_property_listing (explicit columns — no properties%rowtype drift)
-- ---------------------------------------------------------------------------
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
    coalesce(p.parking_available, false)
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
    v_parking_avail
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
    parking_available
  ) values (
    v_new_id,
    v_title,
    v_slug,
    v_description,
    v_rent,
    v_room_type,
    '{}'::text[],
    v_bedrooms,
    v_bathrooms,
    v_furnished,
    v_bond,
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
    v_parking_avail
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

  return v_new_id;
end;
$$;

comment on function public.duplicate_property_listing(uuid) is
  'Landlord-only: draft copy of a listing (empty images, null availability), shared property_group_id when set.';

revoke all on function public.duplicate_property_listing(uuid) from public;
grant execute on function public.duplicate_property_listing(uuid) to authenticated;
