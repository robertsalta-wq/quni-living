-- ============================================================
-- Bootstrap: profile tables + RLS (onboarding / auth)
-- Run in Supabase → SQL Editor if you see:
--   "Could not find the table 'public.landlord_profiles' in the schema cache"
-- Safe to run multiple times (IF NOT EXISTS + DROP POLICY IF EXISTS).
-- For the full app schema, run quni_supabase_schema.sql instead.
-- ============================================================

create extension if not exists "uuid-ossp";

-- Needed for student_profiles.university_id FK (table can be empty)
create table if not exists public.universities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  city text,
  state text,
  created_at timestamptz default now()
);

create table if not exists public.landlord_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  bio text,
  avatar_url text,
  verified boolean default false,
  created_at timestamptz default now()
);

alter table public.landlord_profiles
  add column if not exists terms_accepted_at timestamptz;
alter table public.landlord_profiles
  add column if not exists landlord_terms_accepted_at timestamptz;
alter table public.landlord_profiles
  add column if not exists onboarding_complete boolean default false;

create table if not exists public.student_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  university_id uuid references public.universities (id),
  course text,
  year_of_study integer,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.student_profiles enable row level security;
alter table public.landlord_profiles enable row level security;

drop policy if exists "Users manage own student profile" on public.student_profiles;
drop policy if exists "Users manage own landlord profile" on public.landlord_profiles;
drop policy if exists "Public can read landlord profiles" on public.landlord_profiles;

create policy "Users manage own student profile"
  on public.student_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own landlord profile"
  on public.landlord_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Public can read landlord profiles"
  on public.landlord_profiles for select
  using (true);
