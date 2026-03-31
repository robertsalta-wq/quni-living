-- Backfill university_id and campus_id on properties where they are null,
-- by matching normalised property suburb to campus suburb (one campus per property).
--
-- Run in Supabase SQL Editor after deploying the landlord form fix.
-- Review counts before/after: select university_id, campus_id, count(*) from public.properties group by 1,2;

-- Ensure columns exist (safe to re-run)
alter table public.properties
  add column if not exists university_id uuid references public.universities (id) on delete set null;
alter table public.properties
  add column if not exists campus_id uuid references public.campuses (id) on delete set null;

create index if not exists properties_university_id_idx on public.properties (university_id);
create index if not exists properties_campus_id_idx on public.properties (campus_id);

-- Pick one campus per property when multiple campuses share the same suburb (deterministic: campus id).
update public.properties p
set
  campus_id = x.campus_id,
  university_id = x.university_id
from (
  select distinct on (p2.id)
    p2.id as property_id,
    c.id as campus_id,
    c.university_id as university_id
  from public.properties p2
  inner join public.campuses c
    on lower(trim(coalesce(p2.suburb, ''))) = lower(trim(coalesce(c.suburb, '')))
  where p2.university_id is null
    and p2.campus_id is null
    and coalesce(trim(p2.suburb), '') <> ''
    and p2.status = 'active'
    and c.university_id is not null
  order by p2.id, c.id
) x
where p.id = x.property_id;
