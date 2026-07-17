-- Self-serve booking reinstatement handshake (landlord ↔ tenant within grace window).
-- Writes go through service-role API routes only; parties may select their booking's rows.

create table if not exists public.booking_reinstatement_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  requested_by uuid not null,
  requested_by_role text not null
    check (requested_by_role in ('landlord', 'tenant')),
  requested_at timestamptz not null default now(),
  grace_window_expires_at timestamptz not null,
  status text not null default 'pending_confirmation'
    check (
      status in (
        'pending_confirmation',
        'confirmed',
        'declined',
        'window_expired',
        'cancelled',
        'blocked_unavailable'
      )
    ),
  requested_fee_action text
    check (
      requested_fee_action is null
      or requested_fee_action in ('reinstate_free_flagged', 'recharge')
    ),
  confirmed_by uuid,
  confirmed_at timestamptz,
  fee_action text
    check (
      fee_action is null
      or fee_action in ('reinstate_free_flagged', 'recharge')
    ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_reinstatement_per_booking
  on public.booking_reinstatement_requests (booking_id)
  where status = 'pending_confirmation';

create index if not exists booking_reinstatement_requests_booking_id_idx
  on public.booking_reinstatement_requests (booking_id);

create index if not exists booking_reinstatement_requests_status_idx
  on public.booking_reinstatement_requests (status);

comment on table public.booking_reinstatement_requests is
  'Two-sided handshake to reinstate an expired listing booking within the self-serve grace window.';

alter table public.booking_reinstatement_requests enable row level security;

drop policy if exists "Landlords select own booking_reinstatement_requests"
  on public.booking_reinstatement_requests;
drop policy if exists "Students select own booking_reinstatement_requests"
  on public.booking_reinstatement_requests;
drop policy if exists "Platform admins select booking_reinstatement_requests"
  on public.booking_reinstatement_requests;
drop policy if exists "Service role all booking_reinstatement_requests"
  on public.booking_reinstatement_requests;

create policy "Platform admins select booking_reinstatement_requests"
  on public.booking_reinstatement_requests for select
  using (public.is_platform_admin());

create policy "Landlords select own booking_reinstatement_requests"
  on public.booking_reinstatement_requests for select
  to authenticated
  using (
    booking_id in (
      select b.id
      from public.bookings b
      join public.landlord_profiles lp on lp.id = b.landlord_id
      where lp.user_id = auth.uid()
    )
  );

create policy "Students select own booking_reinstatement_requests"
  on public.booking_reinstatement_requests for select
  to authenticated
  using (
    booking_id in (
      select b.id
      from public.bookings b
      join public.student_profiles sp on sp.id = b.student_id
      where sp.user_id = auth.uid()
    )
  );

create policy "Service role all booking_reinstatement_requests"
  on public.booking_reinstatement_requests
  to service_role
  using (true)
  with check (true);

revoke all on table public.booking_reinstatement_requests from public;
revoke all on table public.booking_reinstatement_requests from anon;
grant select on table public.booking_reinstatement_requests to authenticated;
grant all on table public.booking_reinstatement_requests to service_role;
