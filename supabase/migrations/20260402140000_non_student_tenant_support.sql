-- Non-student tenant support: verification_type, identity supporting doc, listing visibility, guards.

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
alter table public.student_profiles
  add column if not exists verification_type text not null default 'none'
    check (verification_type in ('student', 'identity', 'none'));

alter table public.student_profiles
  add column if not exists identity_supporting_doc_url text;

alter table public.student_profiles
  add column if not exists identity_supporting_submitted_at timestamptz;

-- Chosen onboarding path (written when user answers the fork — not verification completion).
alter table public.student_profiles
  add column if not exists accommodation_verification_route text
    check (accommodation_verification_route is null or accommodation_verification_route in ('student', 'identity'));

comment on column public.student_profiles.verification_type is 'student | identity | none — single source of truth for access and badges; set only when that tier is fully complete.';
comment on column public.student_profiles.accommodation_verification_route is 'student vs identity verification path chosen during onboarding; distinct from verification_type.';

-- Backfill verification_type (full student stack only).
update public.student_profiles
set verification_type = 'student'
where uni_email_verified = true
  and id_document_url is not null
  and enrolment_doc_url is not null;

-- Route inference for existing rows (avoid re-prompting completed students).
update public.student_profiles
set accommodation_verification_route = 'student'
where verification_type = 'student';

update public.student_profiles
set accommodation_verification_route = 'identity'
where verification_type = 'identity';

update public.student_profiles
set accommodation_verification_route = 'student'
where accommodation_verification_route is null
  and coalesce(onboarding_complete, false) = true
  and university_id is not null;

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists open_to_non_students boolean not null default false;

comment on column public.properties.open_to_non_students is 'When false, only fully student-verified tenants (and public/landlord browse) see the listing; identity/none tenants do not.';

-- ---------------------------------------------------------------------------
-- Visibility: who may read active property rows (anon keeps full catalogue).
-- ---------------------------------------------------------------------------
drop policy if exists "Public can view active properties" on public.properties;

create policy "Public can view active properties"
  on public.properties for select
  using (
    status = 'active'
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

-- ---------------------------------------------------------------------------
-- Enquiry insert guard
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can create an enquiry" on public.enquiries;

create policy "Enquiries allowed for visible listings"
  on public.enquiries for insert
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = enquiries.property_id
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

-- ---------------------------------------------------------------------------
-- Booking insert guard
-- ---------------------------------------------------------------------------
drop policy if exists "Students can create bookings" on public.bookings;

create policy "Students can create bookings"
  on public.bookings for insert
  with check (
    student_id = public.current_auth_student_profile_id()
    and exists (
      select 1
      from public.properties p
      where p.id = bookings.property_id
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
-- RPC: distinguish forbidden vs missing listing for logged-in tenants (UI copy).
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

  if st.status is distinct from 'active' then
    return 'not_found';
  end if;

  -- Anonymous: marketing browse (full catalogue).
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

  -- No student_profiles row or identity/none: same visibility as RLS (open listings only).
  if coalesce(vtype, 'none') = 'student' or coalesce(st.open_to_non_students, false) = true then
    return 'ok';
  end if;

  return 'forbidden_student_only';
end;
$$;

revoke all on function public.property_access_status_for_viewer(text) from public;
grant execute on function public.property_access_status_for_viewer(text) to anon, authenticated;

comment on function public.property_access_status_for_viewer(text) is
  'For UI: returns ok | not_found | forbidden_student_only for active listings vs current viewer.';

-- Same as slug variant, keyed by property id (e.g. booking flow).
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

  if st.status is distinct from 'active' then
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

revoke all on function public.property_access_status_for_viewer_by_id(uuid) from public;
grant execute on function public.property_access_status_for_viewer_by_id(uuid) to anon, authenticated;

comment on function public.property_access_status_for_viewer_by_id(uuid) is
  'For UI: same as property_access_status_for_viewer(slug) but by property id.';
