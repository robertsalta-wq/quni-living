-- Listing lease fee: one charge per booking (or per quarter), room-level month credit,
-- and the public pricing page flag. Apply before deploying the code that reads these objects.

insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values (
  'pricing_v2_enabled',
  'false',
  'Show the per-month listing price on the public pricing page',
  'pricing',
  false,
  30
)
on conflict (config_key) do nothing;

create or replace view public.public_platform_features
with (security_invoker = false)
as
select
  coalesce(
    bool_or(
      pc.config_key = 'quni_service_tier_managed_enabled'
      and lower(trim(pc.config_value)) = 'true'
    ),
    false
  ) as managed_tier_enabled,
  coalesce(
    bool_or(
      pc.config_key = 'quni_service_tier_module_enabled'
      and lower(trim(pc.config_value)) = 'true'
    ),
    false
  ) as listing_module_enabled,
  coalesce(
    bool_or(
      pc.config_key = 'pricing_v2_enabled'
      and lower(trim(pc.config_value)) = 'true'
    ),
    false
  ) as pricing_v2_enabled
from public.platform_config pc
where pc.config_key in (
  'quni_service_tier_managed_enabled',
  'quni_service_tier_module_enabled',
  'pricing_v2_enabled'
);

comment on view public.public_platform_features is
  'Public read surface for non-sensitive platform feature toggles.';

grant select on public.public_platform_features to anon, authenticated;

create table public.listing_lease_charges (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  property_id uuid not null references public.properties (id),
  landlord_id uuid not null references public.landlord_profiles (id),
  kind text not null check (kind in ('fixed_term', 'flexible_quarter', 'rollover_quarter')),
  period_start date not null,
  period_end date,
  months integer not null check (months > 0),
  ex_gst_cents integer not null check (ex_gst_cents >= 0),
  gst_cents integer not null check (gst_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  credit_months integer not null default 0 check (credit_months >= 0),
  charged_cents integer not null check (charged_cents >= 0),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'exempt')),
  stripe_payment_intent_id text,
  failure_reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_retry_at timestamptz,
  invoice_storage_path text,
  created_at timestamptz not null default now(),
  charged_at timestamptz
);

create unique index listing_lease_charges_one_fixed
  on public.listing_lease_charges (booking_id)
  where kind = 'fixed_term';

create unique index listing_lease_charges_one_period
  on public.listing_lease_charges (booking_id, kind, period_start);

create index listing_lease_charges_landlord_unpaid
  on public.listing_lease_charges (landlord_id)
  where status = 'failed';

comment on table public.listing_lease_charges is
  'Landlord listing fee charged when a lease is signed. One row per booking for a fixed term, or one row per quarter for flexible and rollover.';

create table public.property_lease_credits (
  property_id uuid primary key references public.properties (id) on delete cascade,
  months_remaining integer not null default 0 check (months_remaining >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.property_lease_credits is
  'Unused lease months credited to a room. Spent on that room''s next lease. Never paid out as cash.';

create table public.property_lease_credit_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  charge_id uuid references public.listing_lease_charges (id) on delete set null,
  months_delta integer not null,
  reason text not null check (reason in ('early_end', 'applied_to_charge')),
  early_end_date date,
  created_at timestamptz not null default now()
);

create unique index property_lease_credit_events_one_early_end
  on public.property_lease_credit_events (booking_id)
  where reason = 'early_end' and booking_id is not null;

alter table public.listing_lease_charges enable row level security;
alter table public.property_lease_credits enable row level security;
alter table public.property_lease_credit_events enable row level security;

create policy listing_lease_charges_select_own
  on public.listing_lease_charges
  for select
  to authenticated
  using (
    landlord_id in (
      select id from public.landlord_profiles where user_id = auth.uid()
    )
  );

create policy property_lease_credits_select_own
  on public.property_lease_credits
  for select
  to authenticated
  using (
    property_id in (
      select p.id
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  );

create policy property_lease_credit_events_select_own
  on public.property_lease_credit_events
  for select
  to authenticated
  using (
    property_id in (
      select p.id
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  );

-- Service role writes. Authenticated users cannot insert or call these functions.
create or replace function public.consume_property_lease_months(p_property_id uuid, p_months integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  available integer;
  used integer;
begin
  if p_property_id is null or p_months is null or p_months < 0 then
    raise exception 'invalid credit consume';
  end if;

  insert into public.property_lease_credits (property_id, months_remaining)
  values (p_property_id, 0)
  on conflict (property_id) do nothing;

  select months_remaining into available
  from public.property_lease_credits
  where property_id = p_property_id
  for update;

  used := least(coalesce(available, 0), p_months);

  update public.property_lease_credits
  set months_remaining = months_remaining - used,
      updated_at = now()
  where property_id = p_property_id;

  return used;
end;
$$;

create or replace function public.grant_property_lease_months(
  p_property_id uuid,
  p_booking_id uuid,
  p_months integer,
  p_early_end_date date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  balance integer;
begin
  if p_property_id is null or p_booking_id is null or p_months is null or p_months < 0 then
    raise exception 'invalid credit grant';
  end if;

  insert into public.property_lease_credits (property_id, months_remaining)
  values (p_property_id, 0)
  on conflict (property_id) do nothing;

  perform 1
  from public.property_lease_credits
  where property_id = p_property_id
  for update;

  insert into public.property_lease_credit_events (
    property_id, booking_id, months_delta, reason, early_end_date
  )
  values (p_property_id, p_booking_id, p_months, 'early_end', p_early_end_date);

  update public.property_lease_credits
  set months_remaining = months_remaining + p_months,
      updated_at = now()
  where property_id = p_property_id
  returning months_remaining into balance;

  return balance;
end;
$$;

revoke all on function public.consume_property_lease_months(uuid, integer) from public, anon, authenticated;
revoke all on function public.grant_property_lease_months(uuid, uuid, integer, date) from public, anon, authenticated;
grant execute on function public.consume_property_lease_months(uuid, integer) to service_role;
grant execute on function public.grant_property_lease_months(uuid, uuid, integer, date) to service_role;
