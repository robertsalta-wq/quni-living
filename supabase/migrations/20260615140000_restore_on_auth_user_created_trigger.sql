-- Production was missing the auth.users → profile bootstrap trigger (handle_new_user exists
-- from earlier migrations but on_auth_user_created was never attached on hosted DB).

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profile rows for auth users created while the trigger was absent.
insert into public.landlord_profiles (user_id, email, full_name, fee_exempt)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  exists (
    select 1
    from public.fee_exempt_accounts fe
    where fe.email = lower(trim(coalesce(u.email, '')))
  )
from auth.users u
where coalesce(u.raw_user_meta_data->>'role', '') = 'landlord'
  and not exists (
    select 1 from public.landlord_profiles lp where lp.user_id = u.id
  )
on conflict (user_id) do nothing;

insert into public.student_profiles (user_id, email, full_name, accommodation_verification_route)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  case
    when nullif(trim(lower(u.raw_user_meta_data->>'accommodation_verification_route')), '') = 'identity'
      then 'non_student'
    when nullif(trim(lower(u.raw_user_meta_data->>'accommodation_verification_route')), '')
      in ('student', 'non_student')
      then nullif(trim(lower(u.raw_user_meta_data->>'accommodation_verification_route')), '')
    else null
  end
from auth.users u
where coalesce(u.raw_user_meta_data->>'role', '') <> 'landlord'
  and not exists (
    select 1 from public.student_profiles sp where sp.user_id = u.id
  )
on conflict (user_id) do nothing;
