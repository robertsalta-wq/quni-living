-- ============================================================
-- Ensure anonymous + authenticated clients can read `campuses`
-- (required for university → campus dropdowns with the anon key).
-- Run in Supabase SQL Editor if campuses always appear empty from the app.
--
-- RLS policy alone is not always enough: the API role needs SELECT grants.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on table public.campuses to anon, authenticated;
grant select on table public.universities to anon, authenticated;

alter table public.campuses enable row level security;

drop policy if exists "Public can read campuses" on public.campuses;

create policy "Public can read campuses"
  on public.campuses
  for select
  to anon, authenticated
  using (true);
