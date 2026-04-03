-- ============================================================
-- Work email verification for non-student tenants
-- ============================================================

alter table public.student_profiles
  add column if not exists work_email text;

alter table public.student_profiles
  add column if not exists work_email_verified boolean default false;

alter table public.student_profiles
  add column if not exists work_email_verified_at timestamptz;

comment on column public.student_profiles.work_email is
  'Verified work/business email used for Resend OTP verification for non-student tenants.';

comment on column public.student_profiles.work_email_verified is
  'True once the work/business email has passed the OTP verification flow.';

comment on column public.student_profiles.work_email_verified_at is
  'Timestamp of when work/business email OTP verification completed.';

