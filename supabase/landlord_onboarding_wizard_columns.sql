-- Landlord 5-step wizard (/onboarding/landlord): insurance + completion timestamps.
-- Run in Supabase SQL Editor if these columns are missing.

alter table public.landlord_profiles
  add column if not exists has_landlord_insurance boolean default false;

alter table public.landlord_profiles
  add column if not exists insurance_acknowledged_at timestamptz null;

alter table public.landlord_profiles
  add column if not exists onboarding_completed_at timestamptz null;

comment on column public.landlord_profiles.has_landlord_insurance is 'Whether landlord reported holding insurance (wizard step 4).';
comment on column public.landlord_profiles.insurance_acknowledged_at is 'When landlord completed insurance step (acknowledged risks or confirmed cover).';
comment on column public.landlord_profiles.onboarding_completed_at is 'When landlord finished the 5-step onboarding wizard.';

-- Optional one-time backfill: existing landlords who already meet platform checklist
-- can be marked wizard-complete so they are not forced through /onboarding/landlord.
-- Uncomment and adjust after reviewing your data:
--
-- update public.landlord_profiles
-- set
--   onboarding_complete = true,
--   onboarding_completed_at = coalesce(onboarding_completed_at, now()),
--   insurance_acknowledged_at = coalesce(insurance_acknowledged_at, now()),
--   has_landlord_insurance = coalesce(has_landlord_insurance, false)
-- where onboarding_complete = false
--   and terms_accepted_at is not null
--   and landlord_terms_accepted_at is not null
--   and coalesce(trim(first_name), '') <> ''
--   and coalesce(trim(last_name), '') <> ''
--   and coalesce(trim(phone), '') <> ''
--   and coalesce(trim(bio), '') <> ''
--   and stripe_charges_enabled = true
--   and stripe_payouts_enabled = true;
