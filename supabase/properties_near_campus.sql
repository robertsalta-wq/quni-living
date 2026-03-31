-- Haversine (great-circle) distance filter in Postgres — used by SEO pages via RPC.
-- Run in Supabase SQL Editor (or migrate) before relying on client RPC calls.

create or replace function public.properties_near_campus(
  campus_lat double precision,
  campus_lon double precision,
  radius_km double precision default 5
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
          cos(radians(campus_lat)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(campus_lon))
          + sin(radians(campus_lat)) * sin(radians(p.latitude::double precision))
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
          cos(radians(campus_lat)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(campus_lon))
          + sin(radians(campus_lat)) * sin(radians(p.latitude::double precision))
        ))
      )
    ) <= radius_km
  order by distance_km asc;
$$;

grant execute on function public.properties_near_campus(double precision, double precision, double precision)
  to anon, authenticated;
