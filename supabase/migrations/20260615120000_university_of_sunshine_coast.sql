-- University of the Sunshine Coast (USC) — missing from original seed; required for Sunshine Coast
-- landlords (e.g. Buderim, Maroochydore) and student verification (@usc.edu.au).

insert into public.universities (id, name, slug, short_name, state, city) values
  ('11111111-0000-0000-0000-000000000042', 'University of the Sunshine Coast', 'usc', 'USC', 'QLD', 'Sunshine Coast')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  short_name = excluded.short_name,
  state = excluded.state,
  city = excluded.city;

insert into public.campuses (id, university_id, name, suburb, state, latitude, longitude) values
  ('22222222-0000-0000-0000-000000000123', '11111111-0000-0000-0000-000000000042', 'Sunshine Coast Campus', 'Sippy Downs', 'QLD', -26.716667, 153.053611),
  ('22222222-0000-0000-0000-000000000124', '11111111-0000-0000-0000-000000000042', 'Moreton Bay Campus', 'Petrie', 'QLD', -27.268889, 152.988056),
  ('22222222-0000-0000-0000-000000000125', '11111111-0000-0000-0000-000000000042', 'Fraser Coast Campus', 'Hervey Bay', 'QLD', -25.288889, 152.832500),
  ('22222222-0000-0000-0000-000000000126', '11111111-0000-0000-0000-000000000042', 'South Bank Campus', 'South Brisbane', 'QLD', -27.478000, 153.017000)
on conflict (id) do update set
  university_id = excluded.university_id,
  name = excluded.name,
  suburb = excluded.suburb,
  state = excluded.state,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

update public.campuses
set slug = trim(
  both '-'
  from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
)
where id in (
  '22222222-0000-0000-0000-000000000123',
  '22222222-0000-0000-0000-000000000124',
  '22222222-0000-0000-0000-000000000125',
  '22222222-0000-0000-0000-000000000126'
)
  and (slug is null or btrim(slug) = '');
