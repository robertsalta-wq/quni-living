-- Backfill campus_id on properties that have coordinates but no campus saved.
--
-- Review only — do NOT run against production from an agent session.
-- Rob runs this in Supabase SQL Editor after reviewing counts below.
--
-- Rules:
-- - Skip rows with no latitude/longitude (fail closed).
-- - When university_id is already set, only consider campuses for that university.
-- - When university_id is null, pick the globally closest campus with coordinates.
-- - Skip rows where no eligible campus has coordinates (fail closed).
-- - Do not overwrite an existing university_id; only set it when null.

-- Preview: rows eligible for backfill
select
  count(*) as properties_missing_campus_with_coords
from public.properties p
where p.campus_id is null
  and p.latitude is not null
  and p.longitude is not null;

-- Preview: how many would match at least one campus with coordinates
select
  count(distinct p.id) as properties_with_candidate_campus
from public.properties p
inner join public.campuses c
  on c.latitude is not null
  and c.longitude is not null
  and c.university_id is not null
  and (p.university_id is null or c.university_id = p.university_id)
where p.campus_id is null
  and p.latitude is not null
  and p.longitude is not null;

-- Preview: sample assignments (no writes)
with candidates as (
  select
    p.id as property_id,
    p.university_id as existing_university_id,
    c.id as campus_id,
    c.university_id as campus_university_id,
    (
      6371 * acos(
        least(1.0::double precision, greatest(-1.0::double precision,
          cos(radians(c.latitude::double precision)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(c.longitude::double precision))
          + sin(radians(c.latitude::double precision)) * sin(radians(p.latitude::double precision))
        ))
      )
    ) as distance_km
  from public.properties p
  inner join public.campuses c
    on c.latitude is not null
    and c.longitude is not null
    and c.university_id is not null
    and (p.university_id is null or c.university_id = p.university_id)
  where p.campus_id is null
    and p.latitude is not null
    and p.longitude is not null
),
ranked as (
  select distinct on (property_id)
    property_id,
    existing_university_id,
    campus_id,
    campus_university_id,
    distance_km
  from candidates
  order by property_id, distance_km asc, campus_id
)
select *
from ranked
order by distance_km asc
limit 50;

-- Apply (uncomment after reviewing previews above)
/*
with candidates as (
  select
    p.id as property_id,
    c.id as campus_id,
    c.university_id as campus_university_id,
    (
      6371 * acos(
        least(1.0::double precision, greatest(-1.0::double precision,
          cos(radians(c.latitude::double precision)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(c.longitude::double precision))
          + sin(radians(c.latitude::double precision)) * sin(radians(p.latitude::double precision))
        ))
      )
    ) as distance_km
  from public.properties p
  inner join public.campuses c
    on c.latitude is not null
    and c.longitude is not null
    and c.university_id is not null
    and (p.university_id is null or c.university_id = p.university_id)
  where p.campus_id is null
    and p.latitude is not null
    and p.longitude is not null
),
ranked as (
  select distinct on (property_id)
    property_id,
    campus_id,
    campus_university_id
  from candidates
  order by property_id, distance_km asc, campus_id
)
update public.properties p
set
  campus_id = r.campus_id,
  university_id = coalesce(p.university_id, r.campus_university_id)
from ranked r
where p.id = r.property_id;
*/
