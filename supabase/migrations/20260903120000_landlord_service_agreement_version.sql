alter table public.landlord_profiles
  add column if not exists landlord_service_agreement_version text;

comment on column public.landlord_profiles.landlord_service_agreement_version is
  'Version of the Landlord Service Agreement accepted (e.g. listing-1.0). Timestamp stays on landlord_terms_accepted_at.';
