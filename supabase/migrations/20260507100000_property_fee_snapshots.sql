-- Phase 2.5: per-listing fee snapshots (locked at listing creation).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_fee_snapshot_source') then
    create type public.property_fee_snapshot_source as enum (
      'listing_creation',
      'admin_override',
      'backfill'
    );
  end if;
end
$$;

create table if not exists public.property_fee_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  service_tier public.service_tier_enum not null,
  source_property_tier text not null
    check (source_property_tier in ('t1', 't2', 't3')),
  fee_mode public.pricing_fee_mode_enum not null,
  fee_percent numeric not null,
  fee_fixed_cents integer not null,
  student_fee_mode public.pricing_fee_mode_enum not null,
  student_fee_percent numeric not null,
  student_fee_fixed_cents integer not null,
  card_surcharge_enabled boolean not null,
  free_transfer_required boolean not null,
  utilities_cap_aud integer not null,
  snapshot_taken_at timestamptz not null default now(),
  snapshot_source public.property_fee_snapshot_source not null,
  changed_by uuid references auth.users (id) on delete set null,
  change_reason text,
  is_active boolean not null default true
);

comment on table public.property_fee_snapshots is
  'Append-only fee terms per listing + service tier; active row is the legal snapshot.';

create index if not exists property_fee_snapshots_property_active_lookup_idx
  on public.property_fee_snapshots (property_id)
  where is_active = true;

create unique index if not exists property_fee_snapshots_one_active_per_tier_idx
  on public.property_fee_snapshots (property_id, service_tier)
  where is_active = true;

create or replace function public.resolve_property_tier_from_listing(
  p_property_type text,
  p_is_registered_rooming_house boolean
)
returns text
language sql
immutable
as $$
  select case
    when trim(coalesce(p_property_type, '')) = 'private_room_landlord_on_site' then 't1'
    when trim(coalesce(p_property_type, '')) = 'private_room_landlord_off_site'
      and coalesce(p_is_registered_rooming_house, false)
      then 't3'
    else 't2'
  end;
$$;

create or replace function public.seed_property_fee_snapshots_from_pricing_config(
  p_property_id uuid,
  p_source_property_tier text,
  p_snapshot_source public.property_fee_snapshot_source,
  p_changed_by uuid,
  p_change_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.property_fee_snapshots (
    property_id,
    service_tier,
    source_property_tier,
    fee_mode,
    fee_percent,
    fee_fixed_cents,
    student_fee_mode,
    student_fee_percent,
    student_fee_fixed_cents,
    card_surcharge_enabled,
    free_transfer_required,
    utilities_cap_aud,
    snapshot_taken_at,
    snapshot_source,
    changed_by,
    change_reason,
    is_active
  )
  select
    p_property_id,
    pc.service_tier,
    p_source_property_tier,
    pc.fee_mode,
    pc.fee_percent,
    pc.fee_fixed_cents,
    pc.student_fee_mode,
    pc.student_fee_percent,
    pc.student_fee_fixed_cents,
    pc.card_surcharge_enabled,
    pc.free_transfer_required,
    pc.utilities_cap_aud,
    now(),
    p_snapshot_source,
    p_changed_by,
    p_change_reason,
    true
  from public.pricing_config pc
  where pc.property_tier = p_source_property_tier
    and pc.service_tier in (
      'listing'::public.service_tier_enum,
      'managed'::public.service_tier_enum
    );
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
    new.is_registered_rooming_house
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

drop trigger if exists properties_seed_fee_snapshots_after_insert on public.properties;
create trigger properties_seed_fee_snapshots_after_insert
  after insert on public.properties
  for each row
  execute procedure public.trg_properties_seed_fee_snapshots();

insert into public.property_fee_snapshots (
  property_id,
  service_tier,
  source_property_tier,
  fee_mode,
  fee_percent,
  fee_fixed_cents,
  student_fee_mode,
  student_fee_percent,
  student_fee_fixed_cents,
  card_surcharge_enabled,
  free_transfer_required,
  utilities_cap_aud,
  snapshot_taken_at,
  snapshot_source,
  changed_by,
  change_reason,
  is_active
)
select
  p.id,
  pc.service_tier,
  public.resolve_property_tier_from_listing(p.property_type::text, p.is_registered_rooming_house),
  pc.fee_mode,
  pc.fee_percent,
  pc.fee_fixed_cents,
  pc.student_fee_mode,
  pc.student_fee_percent,
  pc.student_fee_fixed_cents,
  pc.card_surcharge_enabled,
  pc.free_transfer_required,
  pc.utilities_cap_aud,
  now(),
  'backfill'::public.property_fee_snapshot_source,
  null,
  null,
  true
from public.properties p
inner join public.pricing_config pc
  on pc.property_tier = public.resolve_property_tier_from_listing(p.property_type::text, p.is_registered_rooming_house)
where pc.service_tier in ('listing'::public.service_tier_enum, 'managed'::public.service_tier_enum)
  and not exists (
    select 1
    from public.property_fee_snapshots s
    where s.property_id = p.id
      and s.service_tier = pc.service_tier
      and s.is_active = true
  );

create or replace function public.admin_update_property_fee_snapshots(
  p_property_id uuid,
  p_change_reason text,
  p_listing_fee_mode public.pricing_fee_mode_enum,
  p_listing_fee_percent numeric,
  p_listing_fee_fixed_cents integer,
  p_listing_student_fee_mode public.pricing_fee_mode_enum,
  p_listing_student_fee_percent numeric,
  p_listing_student_fee_fixed_cents integer,
  p_listing_card_surcharge_enabled boolean,
  p_listing_free_transfer_required boolean,
  p_listing_utilities_cap_aud integer,
  p_managed_fee_mode public.pricing_fee_mode_enum,
  p_managed_fee_percent numeric,
  p_managed_fee_fixed_cents integer,
  p_managed_student_fee_mode public.pricing_fee_mode_enum,
  p_managed_student_fee_percent numeric,
  p_managed_student_fee_fixed_cents integer,
  p_managed_card_surcharge_enabled boolean,
  p_managed_free_transfer_required boolean,
  p_managed_utilities_cap_aud integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_src text;
  v_managed_src text;
  v_reason text := trim(p_change_reason);
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;
  if v_reason is null or length(v_reason) = 0 then
    raise exception 'change_reason required';
  end if;

  select source_property_tier into v_listing_src
  from public.property_fee_snapshots
  where property_id = p_property_id
    and service_tier = 'listing'::public.service_tier_enum
    and is_active = true
  limit 1;

  select source_property_tier into v_managed_src
  from public.property_fee_snapshots
  where property_id = p_property_id
    and service_tier = 'managed'::public.service_tier_enum
    and is_active = true
  limit 1;

  if v_listing_src is null or v_managed_src is null then
    raise exception 'missing active fee snapshots for property';
  end if;

  update public.property_fee_snapshots
  set is_active = false
  where property_id = p_property_id
    and is_active = true;

  insert into public.property_fee_snapshots (
    property_id,
    service_tier,
    source_property_tier,
    fee_mode,
    fee_percent,
    fee_fixed_cents,
    student_fee_mode,
    student_fee_percent,
    student_fee_fixed_cents,
    card_surcharge_enabled,
    free_transfer_required,
    utilities_cap_aud,
    snapshot_taken_at,
    snapshot_source,
    changed_by,
    change_reason,
    is_active
  )
  values
    (
      p_property_id,
      'listing'::public.service_tier_enum,
      v_listing_src,
      p_listing_fee_mode,
      p_listing_fee_percent,
      p_listing_fee_fixed_cents,
      p_listing_student_fee_mode,
      p_listing_student_fee_percent,
      p_listing_student_fee_fixed_cents,
      p_listing_card_surcharge_enabled,
      p_listing_free_transfer_required,
      p_listing_utilities_cap_aud,
      now(),
      'admin_override'::public.property_fee_snapshot_source,
      auth.uid(),
      v_reason,
      true
    ),
    (
      p_property_id,
      'managed'::public.service_tier_enum,
      v_managed_src,
      p_managed_fee_mode,
      p_managed_fee_percent,
      p_managed_fee_fixed_cents,
      p_managed_student_fee_mode,
      p_managed_student_fee_percent,
      p_managed_student_fee_fixed_cents,
      p_managed_card_surcharge_enabled,
      p_managed_free_transfer_required,
      p_managed_utilities_cap_aud,
      now(),
      'admin_override'::public.property_fee_snapshot_source,
      auth.uid(),
      v_reason,
      true
    );
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

  select public.resolve_property_tier_from_listing(property_type::text, is_registered_rooming_house)
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

grant execute on function public.admin_update_property_fee_snapshots(
  uuid,
  text,
  public.pricing_fee_mode_enum,
  numeric,
  integer,
  public.pricing_fee_mode_enum,
  numeric,
  integer,
  boolean,
  boolean,
  integer,
  public.pricing_fee_mode_enum,
  numeric,
  integer,
  public.pricing_fee_mode_enum,
  numeric,
  integer,
  boolean,
  boolean,
  integer
) to authenticated;

grant execute on function public.admin_reset_property_fee_snapshots_from_template(uuid, text) to authenticated;

alter table public.property_fee_snapshots enable row level security;

drop policy if exists "Landlords and admins select property_fee_snapshots"
  on public.property_fee_snapshots;
create policy "Landlords and admins select property_fee_snapshots"
  on public.property_fee_snapshots for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.properties pr
      inner join public.landlord_profiles lp on lp.id = pr.landlord_id
      where pr.id = property_fee_snapshots.property_id
        and lp.user_id = auth.uid()
    )
  );
