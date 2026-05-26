-- Occupancy-based weekly rent (base + couple + parking) and booking snapshots for co-tenant.
-- See docs/occupancy-pricing-co-tenant-plan.md

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists max_occupants integer,
  add column if not exists couple_surcharge_per_week numeric(10, 2),
  add column if not exists parking_surcharge_per_week numeric(10, 2),
  add column if not exists parking_available boolean;

update public.properties
set max_occupants = 1
where max_occupants is null;

update public.properties
set parking_available = false
where parking_available is null;

alter table public.properties
  alter column max_occupants set default 1,
  alter column max_occupants set not null,
  alter column parking_available set default false,
  alter column parking_available set not null;

alter table public.properties
  drop constraint if exists properties_max_occupants_check;

alter table public.properties
  add constraint properties_max_occupants_check
  check (max_occupants >= 1 and max_occupants <= 10);

alter table public.properties
  drop constraint if exists properties_couple_surcharge_nonneg_check;

alter table public.properties
  add constraint properties_couple_surcharge_nonneg_check
  check (couple_surcharge_per_week is null or couple_surcharge_per_week >= 0);

alter table public.properties
  drop constraint if exists properties_parking_surcharge_nonneg_check;

alter table public.properties
  add constraint properties_parking_surcharge_nonneg_check
  check (parking_surcharge_per_week is null or parking_surcharge_per_week >= 0);

comment on column public.properties.max_occupants is
  'Maximum occupants allowed; base rent_per_week is for sole occupancy unless couple_surcharge applies.';

comment on column public.properties.couple_surcharge_per_week is
  'Extra weekly rent when booking selects 2 occupants; null = no couple surcharge.';

comment on column public.properties.parking_surcharge_per_week is
  'Extra weekly rent when student selects parking; null = no paid parking option.';

comment on column public.properties.parking_available is
  'Landlord offers optional paid parking; source of truth for booking parking toggle.';

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists occupant_count integer,
  add column if not exists parking_selected boolean,
  add column if not exists rent_breakdown jsonb,
  add column if not exists co_tenant jsonb;

update public.bookings
set occupant_count = 1
where occupant_count is null;

update public.bookings
set parking_selected = false
where parking_selected is null;

update public.bookings
set housemates_count = 0
where housemates_count is null;

alter table public.bookings
  alter column occupant_count set default 1,
  alter column occupant_count set not null,
  alter column parking_selected set default false,
  alter column parking_selected set not null;

alter table public.bookings
  drop constraint if exists bookings_occupant_count_check;

alter table public.bookings
  add constraint bookings_occupant_count_check
  check (occupant_count >= 1 and occupant_count <= 10);

comment on column public.bookings.occupant_count is
  'Number of occupants for this booking; drives resolved weekly_rent with property surcharges.';

comment on column public.bookings.parking_selected is
  'Student opted in to paid parking when property.parking_available.';

comment on column public.bookings.rent_breakdown is
  'AUD breakdown at commit: base, couple, parking (see resolveWeeklyRent).';

comment on column public.bookings.co_tenant is
  'Second occupant snapshot when occupant_count = 2: full_name, email, phone, date_of_birth.';
