-- Listing fee PI id on bookings (refunds), expiry/cancel audit timestamps.

alter table public.bookings add column if not exists listing_fee_stripe_payment_intent_id text;

alter table public.bookings add column if not exists expired_at timestamptz;

alter table public.bookings add column if not exists cancelled_at timestamptz;

alter table public.bookings add column if not exists cancelled_by text;

alter table public.bookings add column if not exists cancellation_reason text;

comment on column public.bookings.listing_fee_stripe_payment_intent_id is
  'Stripe PaymentIntent id for the AUD $99 Listing confirmation charge (refundable on bond-window expiry or landlord cancel).';

comment on column public.bookings.expired_at is
  'When the booking entered expired status (e.g. bond window elapsed).';

comment on column public.bookings.cancelled_at is
  'When the booking entered cancelled status.';

comment on column public.bookings.cancelled_by is
  'Who initiated cancellation (e.g. landlord).';

comment on column public.bookings.cancellation_reason is
  'Optional reason text for cancellation (e.g. landlord-provided).';
