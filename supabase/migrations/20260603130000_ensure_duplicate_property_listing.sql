-- Production was missing duplicate_property_listing (schema cache error). Re-ensure function
-- and copy fields added in later migrations.

create or replace function public.duplicate_property_listing(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_landlord_id uuid;
  r properties%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_group uuid;
  v_slug text;
  v_base text;
  v_suffix text;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select lp.id
  into v_landlord_id
  from public.landlord_profiles lp
  where lp.user_id = v_user_id;

  if v_landlord_id is null then
    raise exception 'not a landlord';
  end if;

  select * into r from public.properties p where p.id = p_source_id and p.landlord_id = v_landlord_id;
  if not found then
    raise exception 'property not found';
  end if;

  if r.property_group_id is not null then
    v_group := r.property_group_id;
  else
    v_group := gen_random_uuid();
    update public.properties
    set property_group_id = v_group
    where id = r.id;
  end if;

  v_base := lower(trim(r.title));
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
    r.title,
    v_slug,
    r.description,
    r.rent_per_week,
    r.room_type,
    '{}'::text[],
    r.bedrooms,
    r.bathrooms,
    r.furnished,
    r.bond,
    r.lease_length,
    r.listing_type,
    r.featured,
    r.address,
    r.suburb,
    r.state,
    r.postcode,
    r.latitude,
    r.longitude,
    r.landlord_id,
    r.university_id,
    r.campus_id,
    null,
    null,
    'draft',
    now(),
    now(),
    r.linen_supplied,
    r.weekly_cleaning_service,
    r.property_type,
    r.open_to_non_students,
    coalesce(r.show_add_another_university, false),
    v_group,
    coalesce(r.is_registered_rooming_house, false),
    r.rooming_house_registration_number,
    r.house_rules,
    coalesce(r.service_tier, 'managed'),
    coalesce(r.max_occupants, 1),
    r.couple_surcharge_per_week,
    r.parking_surcharge_per_week,
    coalesce(r.parking_available, false)
  );

  insert into public.property_features (property_id, feature_id)
  select v_new_id, pf.feature_id
  from public.property_features pf
  where pf.property_id = r.id
  on conflict do nothing;

  insert into public.property_house_rules (property_id, rule_id, permitted)
  select v_new_id, phr.rule_id, phr.permitted
  from public.property_house_rules phr
  where phr.property_id = r.id
  on conflict do nothing;

  return v_new_id;
end;
$$;

comment on function public.duplicate_property_listing(uuid) is
  'Landlord-only: inserts a draft copy of a listing (empty images, null availability), assigns property_group_id.';

revoke all on function public.duplicate_property_listing(uuid) from public;
grant execute on function public.duplicate_property_listing(uuid) to authenticated;
