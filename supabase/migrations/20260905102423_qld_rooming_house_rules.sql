-- QLD rooming house-rules generator (Stage 3). Listing-scoped Schedule 7 insert + s 268(1) extras.
-- Not marketing house_rules / property_house_rules. Additive. No backfill.

alter table public.properties
  add column if not exists qld_rooming_house_rules jsonb null;

comment on column public.properties.qld_rooming_house_rules is
  'QLD rooming house rules pack: { commonAreas: text, extras: { using_shared_facilities?, parking_motor_vehicles?, drinking_alcohol_or_illegal_drugs?, smoking?, making_noise?, keeping_pets?, guests? } }. NULL = not set. Do not write prescribed Schedule 7 text here.';
