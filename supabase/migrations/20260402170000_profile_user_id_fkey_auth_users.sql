-- Ensure profile user_id foreign keys reference auth.users(id).
-- Misconfigured or legacy DBs sometimes reference the wrong relation; then onboarding insert fails with:
--   insert or update on table "student_profiles" violates foreign key constraint "student_profiles_user_id_fkey"
-- If (re)adding the constraint fails, run:
--   select user_id from public.student_profiles sp
--   where not exists (select 1 from auth.users u where u.id = sp.user_id);
-- and remove or fix orphaned rows first.

alter table public.student_profiles
  drop constraint if exists student_profiles_user_id_fkey;

alter table public.student_profiles
  add constraint student_profiles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.landlord_profiles
  drop constraint if exists landlord_profiles_user_id_fkey;

alter table public.landlord_profiles
  add constraint landlord_profiles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
