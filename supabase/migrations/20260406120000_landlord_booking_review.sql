-- =============================================================================
-- Landlord booking review: statuses, AI persistence on bookings, student fit
-- fields, booking conversation thread (booking_messages).
--
-- BOOKING STATUS — allowed values (bookings_status_check)
--   pending, pending_payment, pending_confirmation, awaiting_info, confirmed,
--   active, completed, cancelled, declined, expired, payment_failed
--
-- DOCUMENTED API TRANSITIONS (enforced in Vercel API handlers; see
-- create-rent-subscription.js, refund-booking-deposit.js,
-- booking-request-info.js, cron/expire-bookings.js):
--
--   • pending_payment → pending_confirmation
--       Student completes deposit authorisation (PaymentIntent); client sets
--       status when saving the booking row (existing booking flow).
--
--   • pending_confirmation → confirmed
--       Landlord confirm (capture deposit). Requires Stripe Connect ready.
--
--   • pending_confirmation → declined
--       Landlord decline (cancel/refund uncaptured or captured deposit).
--
--   • pending_confirmation → awaiting_info
--       Landlord “request more information” (creates booking_messages row +
--       notifies student).
--
--   • awaiting_info → awaiting_info
--       Landlord may send further information requests (same API).
--
--   • awaiting_info → confirmed | declined
--       After the message thread, landlord confirms or declines using the same
--       confirm/decline endpoints (deposit still on file).
--
--   • pending_confirmation | awaiting_info → expired
--       Hourly cron when expires_at is in the past (PaymentIntent cancelled or
--       refunded as applicable).
--
-- Note: Product copy sometimes describes “only pending_confirmation” for
-- confirm/decline; operationally awaiting_info is included so landlords can
-- finish the flow after messaging.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bookings: awaiting_info + AI assessment cache
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending',
      'pending_payment',
      'pending_confirmation',
      'awaiting_info',
      'confirmed',
      'active',
      'completed',
      'cancelled',
      'declined',
      'expired',
      'payment_failed'
    )
  );

alter table public.bookings add column if not exists ai_assessment text;
alter table public.bookings add column if not exists ai_assessment_at timestamptz;

comment on column public.bookings.ai_assessment is 'Cached landlord-visible AI summary; regenerated at most once per hour from review UI.';
comment on column public.bookings.ai_assessment_at is 'When ai_assessment was last generated.';

-- ---------------------------------------------------------------------------
-- Student profiles: fit + short bio (optional)
-- ---------------------------------------------------------------------------
alter table public.student_profiles add column if not exists bio text;

alter table public.student_profiles add column if not exists occupancy_type text;
alter table public.student_profiles drop constraint if exists student_profiles_occupancy_type_check;
alter table public.student_profiles
  add constraint student_profiles_occupancy_type_check check (
    occupancy_type is null or occupancy_type in ('sole', 'couple', 'open')
  );

alter table public.student_profiles add column if not exists move_in_flexibility text;
alter table public.student_profiles drop constraint if exists student_profiles_move_in_flexibility_check;
alter table public.student_profiles
  add constraint student_profiles_move_in_flexibility_check check (
    move_in_flexibility is null or move_in_flexibility in ('exact', 'one_week', 'two_weeks')
  );

alter table public.student_profiles add column if not exists has_pets boolean;
alter table public.student_profiles add column if not exists needs_parking boolean;

alter table public.student_profiles add column if not exists bills_preference text;
alter table public.student_profiles drop constraint if exists student_profiles_bills_preference_check;
alter table public.student_profiles
  add constraint student_profiles_bills_preference_check check (
    bills_preference is null or bills_preference in ('included', 'separate', 'either')
  );

alter table public.student_profiles add column if not exists furnishing_preference text;
alter table public.student_profiles drop constraint if exists student_profiles_furnishing_preference_check;
alter table public.student_profiles
  add constraint student_profiles_furnishing_preference_check check (
    furnishing_preference is null or furnishing_preference in ('furnished', 'unfurnished', 'either')
  );

alter table public.student_profiles add column if not exists has_guarantor boolean;
alter table public.student_profiles add column if not exists guarantor_name text;

-- ---------------------------------------------------------------------------
-- booking_messages — landlord ↔ student thread per booking
-- ---------------------------------------------------------------------------
create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('landlord', 'student')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_booking_id_created_idx
  on public.booking_messages (booking_id, created_at);

alter table public.booking_messages enable row level security;

drop policy if exists "Booking participants read messages" on public.booking_messages;
create policy "Booking participants read messages"
  on public.booking_messages for select
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_messages.booking_id
        and (
          b.student_id = public.current_auth_student_profile_id()
          or b.landlord_id in (
            select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
          )
        )
    )
    or public.is_platform_admin()
  );

drop policy if exists "Landlord inserts booking messages" on public.booking_messages;
create policy "Landlord inserts booking messages"
  on public.booking_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = 'landlord'
    and exists (
      select 1
      from public.bookings b
      join public.landlord_profiles lp on lp.id = b.landlord_id
      where b.id = booking_messages.booking_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists "Student inserts booking messages" on public.booking_messages;
create policy "Student inserts booking messages"
  on public.booking_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = 'student'
    and exists (
      select 1
      from public.bookings b
      where b.id = booking_messages.booking_id
        and b.student_id = public.current_auth_student_profile_id()
    )
  );

drop policy if exists "Platform admins all booking_messages" on public.booking_messages;
create policy "Platform admins all booking_messages"
  on public.booking_messages for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select, insert on public.booking_messages to authenticated;
