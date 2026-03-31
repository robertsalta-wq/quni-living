-- ============================================================
-- Campus URL slugs (SEO landing pages: /student-accommodation/:uni/:campus)
-- Run in Supabase SQL Editor after campuses exist.
-- ============================================================

alter table public.campuses add column if not exists slug text;

update public.campuses
set slug = trim(
  both '-'
  from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
)
where slug is null or btrim(slug) = '';

create index if not exists campuses_university_slug_idx on public.campuses (university_id, slug);
