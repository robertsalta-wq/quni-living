-- =============================================================================
-- Set ALL properties to Macquarie University + Macquarie Park Campus
-- =============================================================================
-- Run in Supabase SQL Editor (or psql) as a role allowed to UPDATE public.properties.
--
-- Target campus (from universities_campuses_seed.sql):
--   University: Macquarie University   (slug: mq)
--   Campus:     Macquarie Park Campus   (suburb: Macquarie Park)
--
-- Seed UUIDs (use METHOD B if your DB matches this seed):
--   university_id  11111111-0000-0000-0000-000000000004
--   campus_id      22222222-0000-0000-0000-000000000010
-- =============================================================================

-- Preview (optional)
-- select university_id, campus_id, count(*) from public.properties group by 1, 2 order by 3 desc;

-- -----------------------------------------------------------------------------
-- METHOD A — Resolve by slug + campus name/suburb (portable)
-- -----------------------------------------------------------------------------
begin;

update public.properties p
set
  university_id = t.university_id,
  campus_id = t.campus_id,
  updated_at = now()
from (
  select
    u.id as university_id,
    c.id as campus_id
  from public.universities u
  inner join public.campuses c
    on c.university_id = u.id
  where lower(u.slug) = 'mq'
    and c.name = 'Macquarie Park Campus'
    and c.suburb = 'Macquarie Park'
  limit 1
) t;

-- If METHOD A updated 0 rows, Macquarie rows are missing or names differ — use METHOD B instead.
commit;

-- -----------------------------------------------------------------------------
-- METHOD B — Fixed UUIDs (dev / seed DB only). Run separately if METHOD A failed.
-- -----------------------------------------------------------------------------
-- begin;
-- update public.properties
-- set
--   university_id = '11111111-0000-0000-0000-000000000004'::uuid,
--   campus_id = '22222222-0000-0000-0000-000000000010'::uuid,
--   updated_at = now();
-- commit;

-- Verify
select
  u.name as university,
  c.name as campus,
  c.suburb,
  count(p.id) as property_count
from public.properties p
left join public.universities u on u.id = p.university_id
left join public.campuses c on c.id = p.campus_id
group by u.name, c.name, c.suburb
order by property_count desc;
