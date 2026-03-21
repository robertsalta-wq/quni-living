-- ============================================================
-- QUNI LIVING — Supabase Schema (matches Claude / Wix-style model)
-- Run in Supabase Dashboard → SQL Editor
-- Uses public schema explicitly; drop-policy guards for safer re-runs in dev
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- UNIVERSITIES
-- ============================================================
create table if not exists public.universities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  city text,
  state text,
  created_at timestamptz default now()
);

-- ============================================================
-- CAMPUSES
-- ============================================================
create table if not exists public.campuses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  university_id uuid references public.universities (id) on delete cascade,
  address text,
  created_at timestamptz default now()
);

create index if not exists campuses_university_id_idx on public.campuses (university_id);

-- ============================================================
-- FEATURES (amenity tags)
-- ============================================================
create table if not exists public.features (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  icon text
);

-- ============================================================
-- LANDLORD PROFILES
-- ============================================================
create table if not exists public.landlord_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  first_name text,
  last_name text,
  company_name text,
  abn text,
  landlord_type text,
  address text,
  suburb text,
  state text default 'NSW',
  postcode text,
  email text,
  phone text,
  bio text,
  avatar_url text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- STUDENT PROFILES
-- ============================================================
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

-- ============================================================
-- PROPERTIES
-- ============================================================
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  description text,
  rent_per_week numeric(10, 2) not null,
  room_type text check (room_type in ('single', 'shared', 'studio', 'apartment', 'house')),
  images text[] default '{}',
  bedrooms integer default 1,
  bathrooms integer default 1,
  furnished boolean default false,
  bond numeric(10, 2),
  lease_length text,
  listing_type text check (listing_type in ('rent', 'homestay', 'student_house')),
  featured boolean default false,
  address text,
  suburb text,
  state text default 'NSW',
  postcode text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  landlord_id uuid references public.landlord_profiles (id) on delete set null,
  university_id uuid references public.universities (id) on delete set null,
  campus_id uuid references public.campuses (id) on delete set null,
  available_from date,
  status text default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_university_id_idx on public.properties (university_id);
create index if not exists properties_landlord_id_idx on public.properties (landlord_id);
create index if not exists properties_rent_per_week_idx on public.properties (rent_per_week);

-- ============================================================
-- PROPERTY <-> FEATURES
-- ============================================================
create table if not exists public.property_features (
  property_id uuid references public.properties (id) on delete cascade,
  feature_id uuid references public.features (id) on delete cascade,
  primary key (property_id, feature_id)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties (id) on delete cascade,
  student_id uuid references public.student_profiles (id) on delete cascade,
  landlord_id uuid references public.landlord_profiles (id) on delete set null,
  start_date date not null,
  end_date date,
  weekly_rent numeric(10, 2),
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ENQUIRIES
-- ============================================================
create table if not exists public.enquiries (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties (id) on delete cascade,
  student_id uuid references public.student_profiles (id) on delete set null,
  landlord_id uuid references public.landlord_profiles (id) on delete set null,
  name text,
  email text,
  message text not null,
  status text default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz default now()
);

-- ============================================================
-- UPDATED_AT
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================
-- AUTH → PROFILE ROW (student or landlord from raw_user_meta_data.role)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  nm := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if coalesce(new.raw_user_meta_data->>'role', '') = 'landlord' then
    insert into public.landlord_profiles (user_id, email, full_name)
    values (new.id, new.email, nm)
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, email, full_name)
    values (new.id, new.email, nm)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS — drop then create (re-runnable in dev)
-- ============================================================
alter table public.properties enable row level security;
alter table public.universities enable row level security;
alter table public.campuses enable row level security;
alter table public.features enable row level security;
alter table public.property_features enable row level security;
alter table public.student_profiles enable row level security;
alter table public.landlord_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.enquiries enable row level security;

drop policy if exists "Public can view active properties" on public.properties;
drop policy if exists "Landlords can manage own properties" on public.properties;

drop policy if exists "Public can read universities" on public.universities;
drop policy if exists "Public can read campuses" on public.campuses;
drop policy if exists "Public can read features" on public.features;

drop policy if exists "Public can read property features" on public.property_features;
drop policy if exists "Landlords manage property_features for own listings" on public.property_features;

drop policy if exists "Users manage own student profile" on public.student_profiles;
drop policy if exists "Users manage own landlord profile" on public.landlord_profiles;
drop policy if exists "Public can read landlord profiles" on public.landlord_profiles;

drop policy if exists "Students see own bookings" on public.bookings;
drop policy if exists "Landlords see bookings for their properties" on public.bookings;
drop policy if exists "Students can create bookings" on public.bookings;
drop policy if exists "Participants can update booking status" on public.bookings;

drop policy if exists "Students see own enquiries" on public.enquiries;
drop policy if exists "Landlords see enquiries for their properties" on public.enquiries;
drop policy if exists "Anyone can create an enquiry" on public.enquiries;

create policy "Public can view active properties"
  on public.properties for select
  using (status = 'active');

create policy "Landlords can manage own properties"
  on public.properties for all
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  )
  with check (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

create policy "Public can read universities"
  on public.universities for select
  using (true);

create policy "Public can read campuses"
  on public.campuses for select
  using (true);

create policy "Public can read features"
  on public.features for select
  using (true);

create policy "Public can read property features"
  on public.property_features for select
  using (true);

create policy "Landlords manage property_features for own listings"
  on public.property_features for all
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_features.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_features.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  );

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

create policy "Students see own bookings"
  on public.bookings for select
  using (
    student_id in (select sp.id from public.student_profiles sp where sp.user_id = auth.uid())
  );

create policy "Landlords see bookings for their properties"
  on public.bookings for select
  using (
    landlord_id in (select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid())
  );

create policy "Students can create bookings"
  on public.bookings for insert
  with check (
    student_id in (select sp.id from public.student_profiles sp where sp.user_id = auth.uid())
  );

create policy "Participants can update booking status"
  on public.bookings for update
  using (
    student_id in (select sp.id from public.student_profiles sp where sp.user_id = auth.uid())
    or landlord_id in (select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid())
  );

create policy "Students see own enquiries"
  on public.enquiries for select
  using (
    student_id in (select sp.id from public.student_profiles sp where sp.user_id = auth.uid())
  );

create policy "Landlords see enquiries for their properties"
  on public.enquiries for select
  using (
    landlord_id in (select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid())
    or exists (
      select 1 from public.properties p
      where p.id = enquiries.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  );

create policy "Anyone can create an enquiry"
  on public.enquiries for insert
  with check (true);

-- ============================================================
-- SEED DATA
-- ============================================================
insert into public.universities (name, slug, city, state) values
  ('University of Sydney', 'usyd', 'Sydney', 'NSW'),
  ('UNSW Sydney', 'unsw', 'Sydney', 'NSW'),
  ('University of Technology Sydney', 'uts', 'Sydney', 'NSW'),
  ('Macquarie University', 'mq', 'Sydney', 'NSW'),
  ('Western Sydney University', 'wsu', 'Sydney', 'NSW')
on conflict (slug) do nothing;

insert into public.features (name) values
  ('WiFi'),
  ('Air conditioning'),
  ('Heating'),
  ('Washing machine'),
  ('Dryer'),
  ('Dishwasher'),
  ('Parking'),
  ('Gym access'),
  ('Swimming pool'),
  ('Balcony'),
  ('Garden'),
  ('Pet friendly'),
  ('Bills included'),
  ('Study desk'),
  ('Near public transport')
on conflict (name) do nothing;
