-- Phase 3 listing foundation: booking tier + bond columns, bond_pending status,
-- service_tier_events audit table, landlord Stripe customer id.

-- ---------------------------------------------------------------------------
-- Bookings: service tier + bond window timestamps
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists service_tier_at_request public.service_tier_enum;
alter table public.bookings add column if not exists service_tier_final public.service_tier_enum;
alter table public.bookings add column if not exists bond_received_by_landlord_at timestamptz;
alter table public.bookings add column if not exists bond_window_expires_at timestamptz;

comment on column public.bookings.service_tier_at_request is
  'Renter-selected service tier when the booking was created.';
comment on column public.bookings.service_tier_final is
  'Locked service tier when the landlord confirms.';
comment on column public.bookings.bond_received_by_landlord_at is
  'When the landlord acknowledged receipt of bond.';
comment on column public.bookings.bond_window_expires_at is
  'Deadline for bond_pending (distinct from expires_at).';

-- ---------------------------------------------------------------------------
-- Bookings: extend status check - bond_pending
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending',
      'pending_payment',
      'pending_confirmation',
      'awaiting_info',
      'bond_pending',
      'confirmed',
      'active',
      'completed',
      'cancelled',
      'declined',
      'expired',
      'payment_failed'
    )
  );

-- ---------------------------------------------------------------------------
-- service_tier_events - append-only tier/bond audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.service_tier_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  landlord_id uuid,
  student_id uuid,
  event_type text not null,
  service_tier public.service_tier_enum,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.service_tier_events is
  'Audit log for service tier and related booking lifecycle events; populated by server (service role).';

create index if not exists service_tier_events_booking_created_idx
  on public.service_tier_events (booking_id, created_at desc);

create index if not exists service_tier_events_event_type_created_idx
  on public.service_tier_events (event_type, created_at desc);

alter table public.service_tier_events enable row level security;

drop policy if exists "Platform admins select service_tier_events" on public.service_tier_events;
drop policy if exists "Service role insert service_tier_events" on public.service_tier_events;

create policy "Platform admins select service_tier_events"
  on public.service_tier_events for select
  using (public.is_platform_admin());

create policy "Service role insert service_tier_events"
  on public.service_tier_events for insert
  to service_role
  with check (true);

-- ---------------------------------------------------------------------------
-- Landlord profiles: Stripe Customer id (mirror student_profiles.stripe_customer_id)
-- ---------------------------------------------------------------------------
alter table public.landlord_profiles
  add column if not exists stripe_customer_id text unique;

comment on column public.landlord_profiles.stripe_customer_id is
  'Stripe Customer id (cus_…) for this landlord.';
