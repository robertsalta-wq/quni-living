-- Optional rooming-house registration fields for property listings (data capture only).

alter table public.properties
  add column if not exists is_registered_rooming_house boolean not null default false;

alter table public.properties
  add column if not exists rooming_house_registration_number text null;

comment on column public.properties.is_registered_rooming_house is
  'When true, the landlord indicates the listing is a registered rooming house (NSW).';

comment on column public.properties.rooming_house_registration_number is
  'Registration number when is_registered_rooming_house is true; otherwise null.';
