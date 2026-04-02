-- Non-student email sign-up sends raw_user_meta_data.accommodation_verification_route = 'non_student'.
-- If only 20260402140000 ran, the column CHECK allowed ('student','identity') only — INSERT in
-- handle_new_user() failed, which could prevent the auth user row from completing (no email, no profile).
-- This migration aligns the constraint and trigger with the app (idempotent if 20260402150000 already ran).

update public.student_profiles
set accommodation_verification_route = 'non_student'
where accommodation_verification_route = 'identity';

alter table public.student_profiles
  drop constraint if exists student_profiles_accommodation_verification_route_check;

alter table public.student_profiles
  add constraint student_profiles_accommodation_verification_route_check
  check (accommodation_verification_route is null or accommodation_verification_route in ('student', 'non_student'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
  route text;
begin
  nm := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  route := nullif(trim(lower(new.raw_user_meta_data->>'accommodation_verification_route')), '');
  if route = 'identity' then
    route := 'non_student';
  end if;
  if route is not null and route not in ('student', 'non_student') then
    route := null;
  end if;

  if coalesce(new.raw_user_meta_data->>'role', '') = 'landlord' then
    insert into public.landlord_profiles (user_id, email, full_name)
    values (new.id, new.email, nm)
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, email, full_name, accommodation_verification_route)
    values (new.id, new.email, nm, route)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
