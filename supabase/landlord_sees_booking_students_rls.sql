-- Landlords need to read student_profiles for students who have booked (or requested) their listings.
-- Without this, PostgREST embeds on bookings can fail or hide rows, and the landlord dashboard
-- cannot show guest names/contact for booking requests.
--
-- Run in Supabase SQL Editor after quni_supabase_schema.sql (and alongside other student_profiles policies).
-- Safe to re-run.

drop policy if exists "Landlords read student_profiles for own bookings" on public.student_profiles;

create policy "Landlords read student_profiles for own bookings"
  on public.student_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      inner join public.landlord_profiles lp on lp.id = b.landlord_id
      where b.student_id = student_profiles.id
        and lp.user_id = auth.uid()
    )
  );
