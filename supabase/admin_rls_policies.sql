-- Platform admin access (matches src/lib/adminEmails.ts).
-- Run in Supabase SQL Editor after quni_supabase_schema.sql so the dashboard can
-- read/update bookings, enquiries, properties, and landlord verification.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(trim(auth.jwt() ->> 'email')) in (
      'hello@quni.com.au'
    ),
    false
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- Bookings
drop policy if exists "Platform admins select all bookings" on public.bookings;
drop policy if exists "Platform admins update all bookings" on public.bookings;

create policy "Platform admins select all bookings"
  on public.bookings for select
  using (public.is_platform_admin());

create policy "Platform admins update all bookings"
  on public.bookings for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Enquiries
drop policy if exists "Platform admins select all enquiries" on public.enquiries;
drop policy if exists "Platform admins update all enquiries" on public.enquiries;

create policy "Platform admins select all enquiries"
  on public.enquiries for select
  using (public.is_platform_admin());

create policy "Platform admins update all enquiries"
  on public.enquiries for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Properties (all listings + featured toggle)
drop policy if exists "Platform admins select all properties" on public.properties;
drop policy if exists "Platform admins update all properties" on public.properties;

create policy "Platform admins select all properties"
  on public.properties for select
  using (public.is_platform_admin());

create policy "Platform admins update all properties"
  on public.properties for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins insert properties" on public.properties;
create policy "Platform admins insert properties"
  on public.properties for insert
  with check (public.is_platform_admin());

drop policy if exists "Platform admins manage all property_features" on public.property_features;
create policy "Platform admins manage all property_features"
  on public.property_features for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Student profiles (directory)
drop policy if exists "Platform admins select all student_profiles" on public.student_profiles;

create policy "Platform admins select all student_profiles"
  on public.student_profiles for select
  using (public.is_platform_admin());

-- Landlord profiles (verified toggle — public already has select true)
drop policy if exists "Platform admins update all landlord_profiles" on public.landlord_profiles;

create policy "Platform admins update all landlord_profiles"
  on public.landlord_profiles for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
