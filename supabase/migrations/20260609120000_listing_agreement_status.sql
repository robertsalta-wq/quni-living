-- Listing accept: track tenancy agreement generation separately from booking status.

alter table public.bookings
  add column if not exists listing_agreement_status text
    check (listing_agreement_status is null or listing_agreement_status in ('pending', 'ready', 'failed'));

alter table public.bookings
  add column if not exists listing_agreement_error text;

comment on column public.bookings.listing_agreement_status is
  'Listing tier: pending = post-accept generation in flight; ready = DocuSeal submission exists; failed = generation/signing dispatch failed.';

comment on column public.bookings.listing_agreement_error is
  'Last listing agreement generation error (truncated) when listing_agreement_status = failed.';
