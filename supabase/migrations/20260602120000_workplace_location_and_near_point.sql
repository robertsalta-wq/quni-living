-- Workplace anchor on student profiles + generic near-point listing RPC (R2).

alter table public.student_profiles
  add column if not exists workplace_label text,
  add column if not exists workplace_address text,
  add column if not exists workplace_suburb text,
  add column if not exists workplace_state text,
  add column if not exists workplace_postcode text,
  add column if not exists workplace_latitude double precision,
  add column if not exists workplace_longitude double precision,
  add column if not exists workplace_geocoded_at timestamptz;

comment on column public.student_profiles.workplace_label is 'Optional label for work location search anchor (e.g. office name).';
comment on column public.student_profiles.workplace_address is 'Street line for workplace geocode; optional when suburb/postcode provided.';
comment on column public.student_profiles.workplace_suburb is 'Suburb for workplace search anchor.';
comment on column public.student_profiles.workplace_latitude is 'Geocoded workplace latitude (private; used for distance search).';

create or replace function public.properties_near_point(
  origin_lat double precision,
  origin_lon double precision,
  radius_km double precision default 15
)
returns table (
  id uuid,
  distance_km double precision
)
language sql
stable
as $$
  select
    p.id,
    (
      6371 * acos(
        least(1.0::double precision, greatest(-1.0::double precision,
          cos(radians(origin_lat)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(origin_lon))
          + sin(radians(origin_lat)) * sin(radians(p.latitude::double precision))
        ))
      )
    )::double precision as distance_km
  from public.properties p
  where
    p.latitude is not null
    and p.longitude is not null
    and p.status = 'active'
    and (
      6371 * acos(
        least(1.0::double precision, greatest(-1.0::double precision,
          cos(radians(origin_lat)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(origin_lon))
          + sin(radians(origin_lat)) * sin(radians(p.latitude::double precision))
        ))
      )
    ) <= radius_km
  order by distance_km asc;
$$;

grant execute on function public.properties_near_point(double precision, double precision, double precision)
  to anon, authenticated;

comment on function public.properties_near_point(double precision, double precision, double precision) is
  'Active listings within radius_km of origin (straight-line Haversine). Used for workplace distance search.';
