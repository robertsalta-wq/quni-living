-- Per-booking bond snapshot (populated at apply from properties.bond; scaled on rent override).
-- Rob applies to prod before deploying code that reads bookings.bond_amount.

alter table public.bookings
  add column if not exists bond_amount numeric(10, 2);

comment on column public.bookings.bond_amount is
  'Bond for this booking in AUD. Set at apply from properties.bond; recomputed proportionally when agreed rent overrides.';

-- Backfill existing rows from listing bond or 4× weekly rent.
update public.bookings b
set bond_amount = coalesce(
  (
    select p.bond
    from public.properties p
    where p.id = b.property_id
      and p.bond is not null
      and p.bond > 0
  ),
  case
    when b.weekly_rent is not null and b.weekly_rent > 0 then round(b.weekly_rent * 4, 2)
    else null
  end
)
where b.bond_amount is null;
