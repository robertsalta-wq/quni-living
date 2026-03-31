-- =============================================================================
-- Booking flow: statuses, columns, payments table, property_type
-- =============================================================================
-- PREREQUISITE: `public.properties` and `public.bookings` must already exist.
--
-- If you see: relation "public.properties" does not exist
--   → Run **`quni_supabase_schema.sql`** in SQL Editor first (creates properties,
--      bookings, enquiries, RLS, etc.). Idempotent; safe to re-run.
--   → If you only ever ran **`profile_tables_bootstrap.sql`**, that file does NOT
--      create `properties` — you still need the full schema above.
--
-- Recommended order after the main schema:
--   1. `stripe_connect_foundation.sql` (if not already applied)
--   2. This file (`booking_flow_complete.sql`)
-- =============================================================================

do $guard$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'properties'
  ) then
    raise exception
      'Missing public.properties. Stop here and run supabase/quni_supabase_schema.sql in SQL Editor first (see supabase/README.md).';
  end if;
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'bookings'
  ) then
    raise exception
      'Missing public.bookings. Run supabase/quni_supabase_schema.sql in SQL Editor first.';
  end if;
end
$guard$;

-- ---------------------------------------------------------------------------
-- Properties: booking "property type" (bond / listing context) — distinct from room_type
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists property_type text;

comment on column public.properties.property_type is
  'Student booking context: entire_property | private_room_landlord_off_site | private_room_landlord_on_site | shared_room';

-- ---------------------------------------------------------------------------
-- Bookings: extended lifecycle + payment fields
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists move_in_date date;
alter table public.bookings add column if not exists lease_length text;
alter table public.bookings add column if not exists student_message text;
alter table public.bookings add column if not exists booking_fee_paid boolean default false;
alter table public.bookings add column if not exists deposit_amount integer;
alter table public.bookings add column if not exists platform_fee_amount integer;
alter table public.bookings add column if not exists stripe_payment_intent_id text;
alter table public.bookings add column if not exists deposit_released_at timestamptz;
alter table public.bookings add column if not exists confirmed_at timestamptz;
alter table public.bookings add column if not exists declined_at timestamptz;
alter table public.bookings add column if not exists expires_at timestamptz;
alter table public.bookings add column if not exists bond_acknowledged boolean default false;
alter table public.bookings add column if not exists property_type text;

update public.bookings set move_in_date = start_date where move_in_date is null;

create index if not exists bookings_stripe_payment_intent_id_idx
  on public.bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists bookings_status_expires_at_idx
  on public.bookings (status, expires_at)
  where status = 'pending_confirmation';

create index if not exists bookings_release_deposit_idx
  on public.bookings (status, move_in_date)
  where status = 'confirmed' and deposit_released_at is null;

-- Replace status check (keep legacy values for existing rows)
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending',
      'pending_payment',
      'pending_confirmation',
      'confirmed',
      'active',
      'completed',
      'cancelled',
      'declined',
      'expired',
      'payment_failed'
    )
  );

comment on column public.bookings.move_in_date is 'Tenant move-in date (mirrors start_date for new flow).';
comment on column public.bookings.stripe_payment_intent_id is 'Stripe PaymentIntent for booking deposit (manual capture until landlord confirms).';

-- ---------------------------------------------------------------------------
-- Payments ledger (Stripe webhook + audits; no client RLS — service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings (id) on delete set null,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  amount_total integer,
  amount_platform_fee integer,
  amount_landlord_payout integer,
  payment_type text,
  status text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists payments_booking_id_idx on public.payments (booking_id);
create index if not exists payments_stripe_invoice_id_idx on public.payments (stripe_invoice_id);

alter table public.payments enable row level security;

-- No policies: anon/authenticated clients do not access; service role bypasses RLS.
