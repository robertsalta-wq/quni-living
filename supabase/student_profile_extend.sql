-- ============================================================
-- Student profile extra fields (run once in SQL Editor)
-- Adds columns used by StudentProfile.tsx (tabs: profile + bookings).
-- Ensures `campuses` exists (needed for campus_id FK).
-- ============================================================

create table if not exists public.campuses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  university_id uuid references public.universities (id) on delete cascade,
  address text,
  created_at timestamptz default now()
);

create index if not exists campuses_university_id_idx on public.campuses (university_id);

alter table public.campuses enable row level security;

drop policy if exists "Public can read campuses" on public.campuses;

create policy "Public can read campuses"
  on public.campuses for select
  to anon, authenticated
  using (true);

alter table public.student_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists gender text,
  add column if not exists nationality text,
  add column if not exists campus_id uuid references public.campuses (id) on delete set null,
  add column if not exists student_type text,
  add column if not exists room_type_preference text,
  add column if not exists budget_min_per_week numeric(10, 2),
  add column if not exists budget_max_per_week numeric(10, 2),
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists is_smoker boolean default false,
  add column if not exists date_of_birth date;

comment on column public.student_profiles.student_type is 'e.g. domestic, international';
comment on column public.student_profiles.room_type_preference is 'single, shared, studio, apartment, house';
