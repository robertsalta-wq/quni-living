-- Add university / campus FKs on properties if your project predates them.
-- Requires public.universities and public.campuses (run quni_supabase_schema.sql + seed first).
-- Run in Supabase Dashboard → SQL Editor.

alter table public.properties
  add column if not exists university_id uuid references public.universities (id) on delete set null;

alter table public.properties
  add column if not exists campus_id uuid references public.campuses (id) on delete set null;

create index if not exists properties_university_id_idx on public.properties (university_id);
create index if not exists properties_campus_id_idx on public.properties (campus_id);
