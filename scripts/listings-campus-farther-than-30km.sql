-- Read-only. Listings whose saved campus is more than 30 km from the listing pin.
-- Rob runs this in the Supabase SQL editor. Do not apply it as a migration.

select
  p.id,
  p.title,
  p.suburb,
  p.state,
  c.name as campus,
  u.name as university,
  round(
    (
      6371 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians(c.latitude::double precision)) * cos(radians(p.latitude::double precision))
              * cos(radians(p.longitude::double precision) - radians(c.longitude::double precision))
              + sin(radians(c.latitude::double precision)) * sin(radians(p.latitude::double precision))
          )
        )
      )
    )::numeric,
    1
  ) as distance_km
from public.properties p
join public.campuses c on c.id = p.campus_id
left join public.universities u on u.id = c.university_id
where p.latitude is not null
  and p.longitude is not null
  and c.latitude is not null
  and c.longitude is not null
  and (
    6371 * acos(
      least(
        1,
        greatest(
          -1,
          cos(radians(c.latitude::double precision)) * cos(radians(p.latitude::double precision))
            * cos(radians(p.longitude::double precision) - radians(c.longitude::double precision))
            + sin(radians(c.latitude::double precision)) * sin(radians(p.latitude::double precision))
        )
      )
    )
  ) > 30
order by distance_km desc;
