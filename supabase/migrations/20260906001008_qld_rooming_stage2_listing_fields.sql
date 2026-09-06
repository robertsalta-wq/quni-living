-- QLD rooming Form R18 listing particulars (Stage 2). Additive. No backfill.
-- Item 5 consents are events, not overwrites. Rob applies this to prod before Preview against prod DB.
--
-- Account details stay on property_payout_details (one row per property). Do not add payee
-- columns on properties. Bank name is the only new payout field; payment reference stays the
-- existing {resident name} - {address} convention and is not stored.
-- Service level is Level 1 at fill time. No column.

alter table public.properties
  add column if not exists qld_shares_kitchen_or_bathroom boolean null,
  add column if not exists qld_student_accommodation boolean not null default false,
  add column if not exists qld_persons_at_premises integer null,
  add column if not exists qld_rent_payment_method_1 text null,
  add column if not exists qld_rent_payment_method_2 text null,
  add column if not exists qld_rent_payment_method_2_costs text null,
  add column if not exists qld_rent_payment_method_2_financial_benefit text null,
  add column if not exists qld_rent_last_increased_on date null;

alter table public.properties
  drop constraint if exists properties_qld_persons_at_premises_check;
alter table public.properties
  add constraint properties_qld_persons_at_premises_check
  check (qld_persons_at_premises is null or qld_persons_at_premises between 1 and 99);

comment on column public.properties.qld_shares_kitchen_or_bathroom is
  'QLD room cards only. True if the renter shares a kitchen or bathroom with anyone else. Classifier input. NULL = unanswered (Stage 1 shared-facilities mapping). Not used for NSW or VIC.';
comment on column public.properties.qld_student_accommodation is
  'Form R18 particulars tick. Not a routing input.';
comment on column public.properties.qld_persons_at_premises is
  'Form R18: persons allowed at the premises (whole home). Distinct from max_occupants (this room).';
comment on column public.properties.qld_rent_payment_method_1 is
  'Form R18 item 11 method 1. Locked to Direct credit. Satisfies s 98(2)(b). Account details live on property_payout_details.';
comment on column public.properties.qld_rent_payment_method_2 is
  'Form R18 item 11 method 2. Landlord-chosen second way to pay rent.';
comment on column public.properties.qld_rent_payment_method_2_costs is
  's 99B written notice of costs associated with method 2. Direct credit (method 1) has no extra cost beyond usual bank fees.';
comment on column public.properties.qld_rent_payment_method_2_financial_benefit is
  'Standard term clause 7(5): any financial benefit the provider receives from method 2. Write None if none.';
comment on column public.properties.qld_rent_last_increased_on is
  'Form R18 item 13.2. Last rent increase for this room. NULL = not previously increased. Room-level, survives turnover.';

alter table public.property_payout_details
  add column if not exists bank_name text null;

comment on column public.property_payout_details.bank_name is
  'Bank name for the nominated account. Required for QLD rooming Form R18 item 11. Optional for other Listing properties.';

create table if not exists public.qld_notice_consent_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  booking_id uuid null references public.bookings (id) on delete cascade,
  party text not null
    check (party in ('provider', 'resident', 'provider_agent', 'resident_representative')),
  channel text not null
    check (channel in ('email', 'sms')),
  action text not null
    check (action in ('grant', 'change', 'withdraw')),
  permitted boolean not null,
  address text null,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id)
);

-- If an earlier draft of this never-applied file created the table with nullable created_by, close it now.
alter table public.qld_notice_consent_events
  alter column created_by set default auth.uid();
alter table public.qld_notice_consent_events
  alter column created_by set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qld_notice_consent_events_created_by_fkey'
  ) then
    alter table public.qld_notice_consent_events
      add constraint qld_notice_consent_events_created_by_fkey
      foreign key (created_by) references auth.users (id);
  end if;
end $$;

comment on table public.qld_notice_consent_events is
  'Form R18 item 5 notice consents. Append-only events. Current consent is the latest row per property, booking, party, channel. Fax is not collected. Agent and representative parties exist for schema completeness and stay empty while Item 3 / Item 4 are blank.';
comment on column public.qld_notice_consent_events.created_by is
  'Auth user who recorded this event. Default auth.uid(). Authenticated inserts omit the column and must match auth.uid() (RLS). Service-role apply must supply the acting user id because the service key has no auth.uid().';

create index if not exists qld_notice_consent_events_property_idx
  on public.qld_notice_consent_events (property_id, party, channel, created_at);
create index if not exists qld_notice_consent_events_booking_idx
  on public.qld_notice_consent_events (booking_id)
  where booking_id is not null;

alter table public.qld_notice_consent_events enable row level security;

drop policy if exists qld_notice_consent_events_admin_select on public.qld_notice_consent_events;
drop policy if exists qld_notice_consent_events_landlord_select on public.qld_notice_consent_events;
drop policy if exists qld_notice_consent_events_landlord_insert on public.qld_notice_consent_events;
drop policy if exists qld_notice_consent_events_student_select on public.qld_notice_consent_events;
drop policy if exists qld_notice_consent_events_student_insert on public.qld_notice_consent_events;

create policy qld_notice_consent_events_admin_select
  on public.qld_notice_consent_events for select
  using (public.is_platform_admin());

create policy qld_notice_consent_events_landlord_select
  on public.qld_notice_consent_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where p.id = qld_notice_consent_events.property_id
        and lp.user_id = auth.uid()
    )
  );

create policy qld_notice_consent_events_landlord_insert
  on public.qld_notice_consent_events for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and party = 'provider'
    and booking_id is null
    and exists (
      select 1
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where p.id = qld_notice_consent_events.property_id
        and lp.user_id = auth.uid()
    )
  );

create policy qld_notice_consent_events_student_select
  on public.qld_notice_consent_events for select
  to authenticated
  using (
    party = 'resident'
    and booking_id is not null
    and exists (
      select 1
      from public.bookings b
      join public.student_profiles sp on sp.id = b.student_id
      where b.id = qld_notice_consent_events.booking_id
        and b.property_id = qld_notice_consent_events.property_id
        and sp.user_id = auth.uid()
    )
  );

create policy qld_notice_consent_events_student_insert
  on public.qld_notice_consent_events for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and party = 'resident'
    and booking_id is not null
    and exists (
      select 1
      from public.bookings b
      join public.student_profiles sp on sp.id = b.student_id
      where b.id = qld_notice_consent_events.booking_id
        and b.property_id = qld_notice_consent_events.property_id
        and sp.user_id = auth.uid()
    )
  );

grant select, insert on public.qld_notice_consent_events to authenticated;
grant all on public.qld_notice_consent_events to service_role;
