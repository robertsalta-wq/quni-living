-- ============================================================
-- Student guided onboarding (run once in Supabase SQL Editor)
-- Adds flags + fields for /onboarding/student multi-step flow.
-- ============================================================

alter table public.student_profiles
  add column if not exists onboarding_complete boolean,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists study_level text,
  add column if not exists preferred_move_in_date date,
  add column if not exists preferred_lease_length text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists emergency_contact_email text;

comment on column public.student_profiles.onboarding_complete is 'True after student finishes guided onboarding at /onboarding/student.';
comment on column public.student_profiles.terms_accepted_at is 'When the student accepted Terms + Privacy during onboarding.';
comment on column public.student_profiles.study_level is 'e.g. year_1, year_2, postgraduate, phd — from onboarding dropdown.';
comment on column public.student_profiles.preferred_move_in_date is 'Student preferred move-in from onboarding.';
comment on column public.student_profiles.preferred_lease_length is 'e.g. 3_months, 6_months, 12_months, flexible.';
comment on column public.student_profiles.emergency_contact_relationship is 'Relationship to emergency contact.';
comment on column public.student_profiles.emergency_contact_email is 'Optional emergency contact email.';

-- Grandfather existing rows so only new signups (default false) are prompted.
update public.student_profiles
set onboarding_complete = true
where onboarding_complete is null;

alter table public.student_profiles
  alter column onboarding_complete set default false;

alter table public.student_profiles
  alter column onboarding_complete set not null;
