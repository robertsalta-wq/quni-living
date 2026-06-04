-- FT6600: overseas / non-NSW landlord residence (State/Territory or country), free text.
alter table public.landlord_profiles
  add column if not exists residence_location text;

comment on column public.landlord_profiles.residence_location is
  'When the landlord does not ordinarily reside in NSW: State/Territory or country for FT6600 schedule (landlord_overseas).';
