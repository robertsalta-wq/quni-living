-- Rename route value identity → non_student (tenant signup choice); keep verification_type = 'identity' on completion.

update public.student_profiles
set accommodation_verification_route = 'non_student'
where accommodation_verification_route = 'identity';

alter table public.student_profiles
  drop constraint if exists student_profiles_accommodation_verification_route_check;

alter table public.student_profiles
  add constraint student_profiles_accommodation_verification_route_check
  check (accommodation_verification_route is null or accommodation_verification_route in ('student', 'non_student'));

comment on column public.student_profiles.accommodation_verification_route is
  'student vs non_student verification path chosen at signup; distinct from verification_type.';

-- Account creation: set route from auth raw_user_meta_data (email/password signup).
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
