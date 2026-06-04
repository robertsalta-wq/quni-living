-- Optional spoken languages on renter and landlord profiles (Airbnb-style trust signal).
alter table public.student_profiles
  add column if not exists languages_spoken text[] not null default '{}';

alter table public.landlord_profiles
  add column if not exists languages_spoken text[] not null default '{}';

comment on column public.student_profiles.languages_spoken is
  'ISO-style language codes from shared SPOKEN_LANGUAGE_OPTIONS; shown on profile and to landlords during booking review.';

comment on column public.landlord_profiles.languages_spoken is
  'ISO-style language codes from shared SPOKEN_LANGUAGE_OPTIONS; shown on listings and to renters during booking.';
