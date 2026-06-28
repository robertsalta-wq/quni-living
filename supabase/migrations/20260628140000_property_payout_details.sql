-- Re-key payee bank details from landlord-level to property-level.
drop table if exists public.landlord_payout_details;

create table if not exists public.property_payout_details (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  account_name text not null,
  bsb text not null,
  account_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id)
);

alter table public.property_payout_details enable row level security;

create policy "Landlord manages own property payout details"
  on public.property_payout_details for all
  using (
    property_id in (
      select p.id from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  )
  with check (
    property_id in (
      select p.id from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  );

create policy "Renter reads property payout for accepted listing booking"
  on public.property_payout_details for select
  using (
    exists (
      select 1 from public.bookings b
      where b.property_id = public.property_payout_details.property_id
        and b.student_id = public.current_auth_student_profile_id()
        and b.service_tier_final = 'listing'
        and b.status in ('bond_pending','confirmed','active')
    )
  );

drop trigger if exists property_payout_details_updated_at on public.property_payout_details;
create trigger property_payout_details_updated_at
  before update on public.property_payout_details
  for each row execute function public.set_updated_at();
