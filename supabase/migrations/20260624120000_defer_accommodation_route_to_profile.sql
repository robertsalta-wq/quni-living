-- Stage 1 (renter onboarding redesign): do not set accommodation_verification_route at signup.
-- Route is chosen on profile (section 0) after auth. Rob runs this — proceed?

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
  landlord_exempt boolean;
begin
  nm := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if coalesce(new.raw_user_meta_data->>'role', '') = 'landlord' then
    select exists (
      select 1
      from public.fee_exempt_accounts fe
      where fe.email = lower(trim(coalesce(new.email, '')))
    )
    into landlord_exempt;

    insert into public.landlord_profiles (user_id, email, full_name, fee_exempt)
    values (new.id, new.email, nm, coalesce(landlord_exempt, false))
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, email, full_name)
    values (new.id, new.email, nm)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auth signup bootstrap: landlord or student_profiles row without pre-auth accommodation route.';
