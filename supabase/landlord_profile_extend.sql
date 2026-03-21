-- ============================================================
-- Landlord profile extra fields (run once in SQL Editor)
-- Adds columns used by LandlordProfile.tsx form.
-- ============================================================

alter table public.landlord_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_name text,
  add column if not exists abn text,
  add column if not exists landlord_type text,
  add column if not exists address text,
  add column if not exists suburb text,
  add column if not exists state text default 'NSW',
  add column if not exists postcode text;

comment on column public.landlord_profiles.landlord_type is 'e.g. individual, company, trust';
comment on column public.landlord_profiles.address is 'Street address for business / correspondence';
