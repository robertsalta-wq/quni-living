-- Double booking prevention: partial unique indexes, decline_reason, property status "booked",
-- listing visibility for booked properties, and stricter enquiry/booking guards.
--
-- Valid booking status transitions (application-level; DB does not enforce a state machine):
-- pending_confirmation → confirmed (landlord confirms)
-- pending_confirmation → declined (landlord declines)
-- pending_confirmation → awaiting_info (landlord requests info)
-- awaiting_info → confirmed
-- awaiting_info → declined
-- confirmed → active (deposit released after move-in)
-- Any status → expired (automated expiry)
--
-- Valid property statuses (properties_status_check):
-- active, inactive, pending, suspended, draft, booked
-- "booked" = listing has a confirmed tenant; hidden from search; detail page may still be viewed.

-- ---------------------------------------------------------------------------
-- Bookings: decline_reason (e.g. landlord free text, or system values like property_taken)
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists decline_reason text;

comment on column public.bookings.decline_reason is
  'Landlord decline message and/or system codes (e.g. property_taken) when status is declined.';

-- ---------------------------------------------------------------------------
-- One-time: fix legacy rows that violate new uniqueness (safe to re-run when no dupes)
-- ---------------------------------------------------------------------------
-- A) More than one confirmed/active per property → keep one row, decline the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by property_id
      order by
        case when status = 'active' then 0 else 1 end,
        confirmed_at desc nulls last,
        created_at desc,
        id asc
    ) as rn
  from public.bookings
  where property_id is not null
    and status in ('confirmed', 'active')
)
update public.bookings b
set
  status = 'declined',
  declined_at = coalesce(b.declined_at, now()),
  decline_reason = coalesce(
    nullif(trim(b.decline_reason), ''),
    'migration_resolved_duplicate_confirmed_per_property'
  )
from ranked r
where b.id = r.id
  and r.rn > 1;

-- B) More than one pipeline row per (student, property) → keep one, decline the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by student_id, property_id
      order by
        case status
          when 'active' then 0
          when 'confirmed' then 1
          when 'awaiting_info' then 2
          when 'pending_confirmation' then 3
          else 4
        end,
        confirmed_at desc nulls last,
        created_at desc,
        id asc
    ) as rn
  from public.bookings
  where student_id is not null
    and property_id is not null
    and status in (
      'pending_confirmation',
      'awaiting_info',
      'confirmed',
      'active'
    )
)
update public.bookings b
set
  status = 'declined',
  declined_at = coalesce(b.declined_at, now()),
  decline_reason = coalesce(
    nullif(trim(b.decline_reason), ''),
    'migration_resolved_duplicate_pipeline_per_student_property'
  )
from ranked r
where b.id = r.id
  and r.rn > 1;

-- ---------------------------------------------------------------------------
-- At most one confirmed or active booking per property
-- ---------------------------------------------------------------------------
create unique index if not exists bookings_one_confirmed_per_property
  on public.bookings (property_id)
  where status in ('confirmed', 'active');

-- ---------------------------------------------------------------------------
-- At most one in-flight pipeline per student per property
-- ---------------------------------------------------------------------------
create unique index if not exists bookings_one_pipeline_per_student_property
  on public.bookings (student_id, property_id)
  where status in (
    'pending_confirmation',
    'awaiting_info',
    'confirmed',
    'active'
  );

-- ---------------------------------------------------------------------------
-- Property status: add "booked"
-- ---------------------------------------------------------------------------
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
    status in ('active', 'inactive', 'pending', 'suspended', 'draft', 'booked')
  );

-- ---------------------------------------------------------------------------
-- RLS: allow public read of active + booked (search still filters active in app)
-- ---------------------------------------------------------------------------
drop policy if exists "Public can view active properties" on public.properties;

create policy "Public can view active properties"
  on public.properties for select
  using (
    status in ('active', 'booked')
    and (
      auth.uid() is null
      or exists (
        select 1
        from public.landlord_profiles lp
        where lp.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.student_profiles sp
        where sp.user_id = auth.uid()
          and sp.verification_type = 'student'
      )
      or coalesce(open_to_non_students, false) = true
    )
  );

-- Enquiries only on listings that are still bookable (active)
drop policy if exists "Enquiries allowed for visible listings" on public.enquiries;

create policy "Enquiries allowed for visible listings"
  on public.enquiries for insert
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = enquiries.property_id
        and p.status = 'active'
        and (
          coalesce(p.open_to_non_students, false) = true
          or (
            enquiries.student_id is not null
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = enquiries.student_id
                and sp.verification_type = 'student'
            )
          )
        )
    )
  );

-- Student-initiated booking rows only while listing is active (server also uses service role)
drop policy if exists "Students can create bookings" on public.bookings;

create policy "Students can create bookings"
  on public.bookings for insert
  with check (
    student_id = public.current_auth_student_profile_id()
    and exists (
      select 1
      from public.properties p
      where p.id = bookings.property_id
        and p.status = 'active'
        and (
          coalesce(p.open_to_non_students, false) = true
          or exists (
            select 1
            from public.student_profiles sp
            where sp.id = bookings.student_id
              and sp.verification_type = 'student'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: students may open detail for active or booked (booking UI handles booked copy)
-- ---------------------------------------------------------------------------
create or replace function public.property_access_status_for_viewer(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  st public.properties%rowtype;
  vtype text;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return 'not_found';
  end if;

  select * into st
  from public.properties p
  where p.slug = trim(p_slug)
  limit 1;

  if not found then
    return 'not_found';
  end if;

  if st.status is distinct from 'active' and st.status is distinct from 'booked' then
    return 'not_found';
  end if;

  if uid is null then
    return 'ok';
  end if;

  if exists (select 1 from public.landlord_profiles lp where lp.user_id = uid) then
    return 'ok';
  end if;

  select sp.verification_type into vtype
  from public.student_profiles sp
  where sp.user_id = uid
  limit 1;

  if coalesce(vtype, 'none') = 'student' or coalesce(st.open_to_non_students, false) = true then
    return 'ok';
  end if;

  return 'forbidden_student_only';
end;
$$;

create or replace function public.property_access_status_for_viewer_by_id(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  st public.properties%rowtype;
  vtype text;
begin
  if p_id is null then
    return 'not_found';
  end if;

  select * into st from public.properties p where p.id = p_id limit 1;
  if not found then
    return 'not_found';
  end if;

  if st.status is distinct from 'active' and st.status is distinct from 'booked' then
    return 'not_found';
  end if;

  if uid is null then
    return 'ok';
  end if;

  if exists (select 1 from public.landlord_profiles lp where lp.user_id = uid) then
    return 'ok';
  end if;

  select sp.verification_type into vtype
  from public.student_profiles sp
  where sp.user_id = uid
  limit 1;

  if coalesce(vtype, 'none') = 'student' or coalesce(st.open_to_non_students, false) = true then
    return 'ok';
  end if;

  return 'forbidden_student_only';
end;
$$;

comment on function public.property_access_status_for_viewer(text) is
  'For UI: ok | not_found | forbidden_student_only for active or booked listings vs current viewer.';

comment on function public.property_access_status_for_viewer_by_id(uuid) is
  'For UI: same as property_access_status_for_viewer(slug) but by property id; allows booked.';
