-- Admin payments dashboard: payments Xero columns, refunds audit, platform_settings, xero_settings, bonds.
--
-- PREREQUISITE (in order):
--   1. quni_supabase_schema.sql  — base tables including bookings
--   2. stripe_connect_foundation.sql — if you use Stripe Connect (optional but typical)
--   3. booking_flow_complete.sql — creates public.payments and extends bookings
--   4. admin_rls_policies.sql — defines is_platform_admin(); re-run after this file if you split runs
--
do $guard$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payments'
  ) then
    raise exception
      'Missing public.payments. Stop and run supabase/booking_flow_complete.sql in SQL Editor first (see header in that file). It creates the payments ledger after bookings exist.';
  end if;
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bookings'
  ) then
    raise exception
      'Missing public.bookings. Run supabase/quni_supabase_schema.sql first, then booking_flow_complete.sql.';
  end if;
end
$guard$;

-- ---------------------------------------------------------------------------
-- payments: Xero + refund audit
-- ---------------------------------------------------------------------------
alter table public.payments add column if not exists xero_invoice_id text;
alter table public.payments add column if not exists xero_synced_at timestamptz;
alter table public.payments add column if not exists xero_sync_status text;

alter table public.payments add column if not exists refund_reason text;
alter table public.payments add column if not exists refund_notes text;
alter table public.payments add column if not exists refund_amount_cents integer;
alter table public.payments add column if not exists refunded_at timestamptz;
alter table public.payments add column if not exists refunded_by_admin_user_id uuid references auth.users (id) on delete set null;
alter table public.payments add column if not exists stripe_refund_id text;

comment on column public.payments.xero_sync_status is 'pending | synced | failed';

-- ---------------------------------------------------------------------------
-- platform_settings (key/value — fee rates for display & future bookings)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists platform_settings_key_idx on public.platform_settings (key);

alter table public.platform_settings enable row level security;

insert into public.platform_settings (key, value) values
  ('landlord_service_fee_pct', '5'),
  ('student_platform_fee_pct', '3'),
  ('student_booking_processing_fee_aud', '49'),
  ('landlord_acceptance_fee_aud', '0')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- xero_settings (OAuth — service role / server only; no client SELECT policy)
-- ---------------------------------------------------------------------------
create table if not exists public.xero_settings (
  id uuid primary key default gen_random_uuid(),
  access_token text,
  refresh_token text,
  tenant_id text,
  connected_at timestamptz,
  last_sync_at timestamptz
);

alter table public.xero_settings enable row level security;

-- ---------------------------------------------------------------------------
-- bonds (rental bond audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.bonds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  student_id uuid not null references public.student_profiles (user_id) on delete cascade,
  landlord_id uuid not null references public.landlord_profiles (user_id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  bond_amount integer not null,
  bond_type text not null default 'cash',
  bond_status text not null default 'pending_lodgement',
  state text,
  bond_authority text,
  lodgement_reference text,
  lodged_at timestamptz,
  released_at timestamptz,
  dispute_notes text,
  acknowledged_by_student boolean not null default false,
  acknowledged_by_landlord boolean not null default false,
  student_acknowledged_at timestamptz,
  landlord_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bonds_booking_id_unique on public.bonds (booking_id);
create index if not exists bonds_bond_status_idx on public.bonds (bond_status);
create index if not exists bonds_student_user_idx on public.bonds (student_id);
create index if not exists bonds_landlord_user_idx on public.bonds (landlord_id);

drop trigger if exists bonds_updated_at on public.bonds;
create trigger bonds_updated_at
  before update on public.bonds
  for each row execute function public.set_updated_at();

alter table public.bonds enable row level security;

-- ---------------------------------------------------------------------------
-- Platform admin policies (matches is_platform_admin)
-- ---------------------------------------------------------------------------
drop policy if exists "Platform admins select all payments" on public.payments;
drop policy if exists "Platform admins update all payments" on public.payments;

create policy "Platform admins select all payments"
  on public.payments for select
  using (public.is_platform_admin());

create policy "Platform admins update all payments"
  on public.payments for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins select platform_settings" on public.platform_settings;
drop policy if exists "Platform admins insert platform_settings" on public.platform_settings;
drop policy if exists "Platform admins update platform_settings" on public.platform_settings;
drop policy if exists "Platform admins delete platform_settings" on public.platform_settings;

create policy "Platform admins select platform_settings"
  on public.platform_settings for select
  using (public.is_platform_admin());

create policy "Platform admins insert platform_settings"
  on public.platform_settings for insert
  with check (public.is_platform_admin());

create policy "Platform admins update platform_settings"
  on public.platform_settings for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete platform_settings"
  on public.platform_settings for delete
  using (public.is_platform_admin());

-- xero_settings: no policies — only service role (server-side). Admins use API for status.

drop policy if exists "Platform admins select all bonds" on public.bonds;
drop policy if exists "Platform admins insert bonds" on public.bonds;
drop policy if exists "Platform admins update all bonds" on public.bonds;

create policy "Platform admins select all bonds"
  on public.bonds for select
  using (public.is_platform_admin());

create policy "Platform admins insert bonds"
  on public.bonds for insert
  with check (public.is_platform_admin());

create policy "Platform admins update all bonds"
  on public.bonds for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
