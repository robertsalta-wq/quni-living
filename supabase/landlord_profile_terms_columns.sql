-- Run in Supabase SQL Editor if landlord_profiles lacks agreement timestamps.
alter table public.landlord_profiles
  add column if not exists terms_accepted_at timestamptz;

alter table public.landlord_profiles
  add column if not exists landlord_terms_accepted_at timestamptz;

comment on column public.landlord_profiles.terms_accepted_at is 'When the landlord accepted Terms of Service and Privacy Policy.';
comment on column public.landlord_profiles.landlord_terms_accepted_at is 'When the landlord accepted the Landlord Service Agreement.';
