-- Nullable grouping for "other rooms at this address" (future use).
alter table public.properties
  add column if not exists property_group_id uuid;

comment on column public.properties.property_group_id is
  'Optional stable id shared by listings for the same physical address / property; used when duplicating rooms.';

-- Referenced by duplicate RPC (may already exist from older SQL scripts).
alter table public.properties
  add column if not exists show_add_another_university boolean default false;

-- Landlord UI duplicate creates draft listings; extend status check to allow draft.
alter table public.properties drop constraint if exists properties_status_check;

do $$
declare
  r record;
  def text;
begin
  for r in
    select c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'properties'
      and c.contype = 'c'
  loop
    def := r.def;
    if def is not null
      and def ilike '%status%'
      and (def ilike '%active%' or def ilike '%inactive%' or def ilike '%pending%')
    then
      execute format('alter table public.properties drop constraint %I', r.conname);
    end if;
  end loop;
end $$;

alter table public.properties
  add constraint properties_status_check
  check (
    status in ('active', 'inactive', 'pending', 'suspended', 'draft')
  );

-- Atomic duplicate: new row + property_group_id rules + backfill group on source when null.
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
    status,
    created_at,
    updated_at,
    linen_supplied,
    weekly_cleaning_service,
    property_type,
    open_to_non_students,
    show_add_another_university,
    property_group_id
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
    'draft',
    now(),
    now(),
    r.linen_supplied,
    r.weekly_cleaning_service,
    r.property_type,
    r.open_to_non_students,
    coalesce(r.show_add_another_university, false),
    v_group
  );

  return v_new_id;
end;
$$;

comment on function public.duplicate_property_listing(uuid) is
  'Landlord-only: inserts a draft copy of a listing (empty images, null available_from), assigns property_group_id.';

revoke all on function public.duplicate_property_listing(uuid) from public;
grant execute on function public.duplicate_property_listing(uuid) to authenticated;
