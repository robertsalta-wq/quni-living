-- Listing unwind: allow listing_agreement_status = voided when booking is cancelled/expired.

alter table public.bookings drop constraint if exists bookings_listing_agreement_status_check;

alter table public.bookings
  add constraint bookings_listing_agreement_status_check
  check (
    listing_agreement_status is null
    or listing_agreement_status in ('pending', 'ready', 'failed', 'voided')
  );

comment on column public.bookings.listing_agreement_status is
  'Listing tier: pending = post-accept generation in flight; ready = DocuSeal submission exists; failed = generation/signing dispatch failed; voided = agreement unwound (cancel/expiry).';
