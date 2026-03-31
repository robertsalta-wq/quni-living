-- Dashboard checklist: hide banner after completion (mirrors student_profiles.onboarding_complete).
alter table public.landlord_profiles
  add column if not exists onboarding_complete boolean default false;

update public.landlord_profiles
set onboarding_complete = coalesce(onboarding_complete, false)
where onboarding_complete is null;

alter table public.landlord_profiles
  alter column onboarding_complete set default false;

alter table public.landlord_profiles
  alter column onboarding_complete set not null;

comment on column public.landlord_profiles.onboarding_complete is 'True after landlord finishes dashboard onboarding checklist (dismissed success).';
