-- Student weekly rent payment preference (for prescribed form / DocuSeal).
alter table public.bookings
  add column if not exists rent_payment_method text;

alter table public.bookings
  drop constraint if exists bookings_rent_payment_method_check;

alter table public.bookings
  add constraint bookings_rent_payment_method_check
  check (
    rent_payment_method is null
    or rent_payment_method in ('bank_transfer', 'quni_platform')
  );

comment on column public.bookings.rent_payment_method is
  'Student preference for weekly rent after move-in: bank_transfer | quni_platform; set at booking commit.';
