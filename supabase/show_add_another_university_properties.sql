-- Persist the landlord's "Add another university" checkbox preference.
-- This fixes edit-mode checkbox state being re-derived from nearby-campus logic.

-- 1) Add column (safe to re-run)
alter table public.properties
  add column if not exists show_add_another_university boolean;

-- 2) Backfill existing rows
update public.properties
set show_add_another_university = coalesce(show_add_another_university, false);

-- 3) Set default for future inserts (safe to re-run)
alter table public.properties
  alter column show_add_another_university set default false;

