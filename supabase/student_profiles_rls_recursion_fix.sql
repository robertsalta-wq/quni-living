-- ============================================================
-- Fix: infinite recursion detected in policy for relation "student_profiles"
-- ============================================================
-- Cause: Policies on bookings/enquiries used
--   student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid())
-- while policies on student_profiles (landlord read-via-booking) scan bookings.
-- That re-enters student_profiles RLS → infinite recursion on any SELECT/UPDATE
-- that evaluates all student_profiles policies (e.g. onboarding terms save).
--
-- Fix: resolve the current user's student_profiles.id inside a SECURITY DEFINER
-- function so the lookup bypasses RLS and breaks the cycle.
--
-- Safe to re-run. Run in Supabase SQL Editor (or: supabase db query --linked -f ...).

create or replace function public.current_auth_student_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select sp.id
  from public.student_profiles sp
  where sp.user_id = (select auth.uid())
  limit 1;
$$;

comment on function public.current_auth_student_profile_id() is
  'RLS-safe: returns student_profiles.id for auth.uid() without re-evaluating student_profiles policies.';

revoke all on function public.current_auth_student_profile_id() from public;
grant execute on function public.current_auth_student_profile_id() to authenticated, anon;

-- Bookings: replace subqueries that touched student_profiles under bookings RLS
drop policy if exists "Students see own bookings" on public.bookings;
create policy "Students see own bookings"
  on public.bookings for select
  using (student_id = public.current_auth_student_profile_id());

drop policy if exists "Students can create bookings" on public.bookings;
create policy "Students can create bookings"
  on public.bookings for insert
  with check (student_id = public.current_auth_student_profile_id());

drop policy if exists "Participants can update booking status" on public.bookings;
create policy "Participants can update booking status"
  on public.bookings for update
  using (
    student_id = public.current_auth_student_profile_id()
    or landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

-- Enquiries: same pattern
drop policy if exists "Students see own enquiries" on public.enquiries;
create policy "Students see own enquiries"
  on public.enquiries for select
  using (student_id = public.current_auth_student_profile_id());
