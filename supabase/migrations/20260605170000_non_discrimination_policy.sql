alter table public.landlord_profiles
  add column if not exists non_discrimination_policy_accepted_at timestamptz,
  add column if not exists non_discrimination_policy_version text;

comment on column public.landlord_profiles.non_discrimination_policy_accepted_at is
  'When the landlord accepted Quni''s Non-Discrimination Policy.';
comment on column public.landlord_profiles.non_discrimination_policy_version is
  'Version identifier of the Non-Discrimination Policy accepted (e.g. 2026-06-05).';
