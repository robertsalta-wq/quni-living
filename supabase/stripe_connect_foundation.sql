-- Stripe Connect + Subscriptions — foundation (run in SQL Editor after main schema)
-- Stores IDs only; all charges/subscriptions are created via Edge Functions or Stripe Dashboard + webhooks.

-- ---------------------------------------------------------------------------
-- Landlord: Stripe Connect Express account
-- ---------------------------------------------------------------------------
alter table public.landlord_profiles
  add column if not exists stripe_connect_account_id text unique;

alter table public.landlord_profiles
  add column if not exists stripe_connect_details_submitted boolean default false;

alter table public.landlord_profiles
  add column if not exists stripe_charges_enabled boolean default false;

alter table public.landlord_profiles
  add column if not exists stripe_payouts_enabled boolean default false;

comment on column public.landlord_profiles.stripe_connect_account_id is 'Stripe Connect account id (acct_…).';

-- ---------------------------------------------------------------------------
-- Student: Stripe Customer for Payment Element / subscriptions
-- ---------------------------------------------------------------------------
alter table public.student_profiles
  add column if not exists stripe_customer_id text unique;

comment on column public.student_profiles.stripe_customer_id is 'Stripe Customer id (cus_…) for this student.';

-- ---------------------------------------------------------------------------
-- Booking: recurring rent subscription (fixed weekly rent for lease term)
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists stripe_subscription_id text unique;

alter table public.bookings
  add column if not exists stripe_subscription_status text;

comment on column public.bookings.stripe_subscription_id is 'Stripe Subscription id (sub_…) when rent is billed weekly.';
comment on column public.bookings.stripe_subscription_status is 'Cached status from Stripe (active, past_due, canceled, …).';

create index if not exists bookings_stripe_subscription_id_idx
  on public.bookings (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- Webhook idempotency (prevent double-processing the same Stripe event)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is 'Stripe event ids already applied (evt_…).';

alter table public.stripe_webhook_events enable row level security;

-- No policies: only service role / Edge Functions with service key may access.
