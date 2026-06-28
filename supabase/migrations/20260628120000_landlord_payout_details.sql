create table if not exists public.landlord_payout_details (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlord_profiles(id) on delete cascade,
  account_name text not null,
  bsb text not null,
  account_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (landlord_id)
);

alter table public.landlord_payout_details enable row level security;

-- Landlord manages own payee details
create policy "Landlord manages own payout details"
  on public.landlord_payout_details for all
  using (landlord_id in (select id from public.landlord_profiles where user_id = auth.uid()))
  with check (landlord_id in (select id from public.landlord_profiles where user_id = auth.uid()));

-- Renter reads payee details only for an accepted Listing booking with that landlord.
-- Reuses current_auth_student_profile_id() (same helper the bookings student policy uses).
create policy "Renter reads payout for accepted listing booking"
  on public.landlord_payout_details for select
  using (
    exists (
      select 1 from public.bookings b
      where b.landlord_id = public.landlord_payout_details.landlord_id
        and b.student_id = public.current_auth_student_profile_id()
        and b.service_tier_final = 'listing'
        and b.status in ('bond_pending','confirmed','active')
    )
  );

drop trigger if exists landlord_payout_details_updated_at on public.landlord_payout_details;
create trigger landlord_payout_details_updated_at
  before update on public.landlord_payout_details
  for each row execute function public.set_updated_at();
