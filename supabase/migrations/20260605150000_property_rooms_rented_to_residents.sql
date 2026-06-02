-- QLD on-site boarder/lodger: rooms occupied/available for residents (s 43 threshold).

alter table public.properties
  add column if not exists rooms_rented_to_residents smallint;

comment on column public.properties.rooms_rented_to_residents is
  'For QLD on-site listings: count of rooms occupied or available for residents in the home (s 43 RTRA Act). Null when not applicable.';

alter table public.properties
  drop constraint if exists properties_rooms_rented_to_residents_check;

alter table public.properties
  add constraint properties_rooms_rented_to_residents_check
  check (rooms_rented_to_residents is null or (rooms_rented_to_residents >= 1 and rooms_rented_to_residents <= 99));
