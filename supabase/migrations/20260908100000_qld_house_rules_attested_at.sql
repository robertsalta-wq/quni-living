-- Form R18 Item 17. Timestamped provider attestation that house rules were given
-- to the resident before signing (s 275). Sample PDFs use a fixture. Accept stays
-- gated until Stage 6. Rob applies this to prod before code that writes the column.

alter table public.bookings
  add column if not exists qld_house_rules_attested_at timestamptz null;

comment on column public.bookings.qld_house_rules_attested_at is
  'Form R18 item 17. When the provider attested that house rules were given to the resident. NULL = not attested. Generator refuses without this.';
