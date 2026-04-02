-- ============================================================
-- Landlords can read student_profiles for linked bookings/enquiries
-- without nested RLS hiding booking rows (empty student join in dashboard).
-- ============================================================
-- Replaces EXISTS(...) policies that scan bookings under invoker RLS.
-- Safe to re-run.

create or replace function public.landlord_may_read_student_profile(sp_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bookings b
    inner join public.landlord_profiles lp on lp.id = b.landlord_id
    where b.student_id = sp_profile_id
      and lp.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.enquiries e
    inner join public.landlord_profiles lp on lp.id = e.landlord_id
    where e.student_id = sp_profile_id
      and lp.user_id = (select auth.uid())
  );
$$;

comment on function public.landlord_may_read_student_profile(uuid) is
  'True if auth.uid() is a landlord with a booking or enquiry referencing this student_profiles.id. Bypasses RLS for the existence check.';

revoke all on function public.landlord_may_read_student_profile(uuid) from public;
grant execute on function public.landlord_may_read_student_profile(uuid) to authenticated;

drop policy if exists "Landlords read student_profiles for own bookings" on public.student_profiles;
drop policy if exists "Landlords read student_profiles for own enquiries" on public.student_profiles;

create policy "Landlords read linked student_profiles"
  on public.student_profiles
  for select
  to authenticated
  using (public.landlord_may_read_student_profile(student_profiles.id));
