-- Canonical booking event log foundation (Stage 1).
-- NEW table public.booking_events — does NOT rename or replace service_tier_events.
-- Also creates provider_webhook_health for gap-monitor (a).
--
-- Rob applies this to prod before merging application code that writes
-- to booking_events. Agent must not supabase db push to production.
--
-- STE remains for property-tier telemetry and legacy operational reads
-- (rate-limit, PI recovery, expiry-refund marker) until those are moved.

-- ---------------------------------------------------------------------------
-- 1. booking_events
-- ---------------------------------------------------------------------------
create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  landlord_id uuid,
  student_id uuid,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  audience text not null default 'internal',
  outcome text not null default 'n/a',
  actor_type text not null default 'system',
  actor_id uuid,
  actor_label text,
  changes jsonb,
  reason text,
  provider text,
  provider_ref text,
  correlation_id text,
  document_id uuid references public.tenancy_documents (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  schema_version smallint not null default 1,
  constraint booking_events_audience_check
    check (audience in ('internal', 'both')),
  constraint booking_events_outcome_check
    check (outcome in ('success', 'failure', 'pending', 'n/a')),
  constraint booking_events_actor_type_check
    check (actor_type in ('system', 'student', 'landlord', 'admin', 'webhook', 'cron')),
  constraint booking_events_event_type_nonempty
    check (length(trim(event_type)) > 0),
  constraint booking_events_schema_version_positive
    check (schema_version >= 1)
);

comment on table public.booking_events is
  'Append-only canonical booking event log. Evidence of outcomes (status, documents, email delivery). Renter UI filters audience=both; email events are always internal.';

comment on column public.booking_events.occurred_at is
  'When the real-world event happened (may be backdated on DocuSeal reconcile). Sort key for timelines.';

comment on column public.booking_events.created_at is
  'When Quni inserted this row (distinct from occurred_at for late reconcile evidence).';

comment on column public.booking_events.actor_label is
  'Display name frozen at write time (e.g. Quinn Lee). Do not resolve at read time.';

comment on column public.booking_events.changes is
  'Structured diffs: [{"field":"lease_length","old":"6 months","new":"3 months"}, ...]';

comment on column public.booking_events.provider is
  'External system: docuseal | resend | stripe | null';

comment on column public.booking_events.provider_ref is
  'External id (DocuSeal submission id, Resend email id, …)';

comment on column public.booking_events.correlation_id is
  'Ties related rows (email attempt→delivery). Landlord UI may collapse by this key.';

comment on column public.booking_events.audience is
  'internal = landlord/admin only; both = also visible on renter timeline. Email events must be internal.';

create index if not exists booking_events_booking_occurred_idx
  on public.booking_events (booking_id, occurred_at desc);

create index if not exists booking_events_booking_audience_occurred_idx
  on public.booking_events (booking_id, audience, occurred_at desc);

create index if not exists booking_events_event_type_occurred_idx
  on public.booking_events (event_type, occurred_at desc);

create index if not exists booking_events_provider_ref_idx
  on public.booking_events (provider, provider_ref)
  where provider_ref is not null;

create index if not exists booking_events_correlation_idx
  on public.booking_events (correlation_id)
  where correlation_id is not null;

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
alter table public.booking_events enable row level security;

drop policy if exists "Platform admins select booking_events" on public.booking_events;
drop policy if exists "Landlords select own booking_events" on public.booking_events;
drop policy if exists "Students select both-audience booking_events" on public.booking_events;
drop policy if exists "Service role insert booking_events" on public.booking_events;

create policy "Platform admins select booking_events"
  on public.booking_events for select
  using (public.is_platform_admin());

create policy "Landlords select own booking_events"
  on public.booking_events for select
  to authenticated
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

create policy "Students select both-audience booking_events"
  on public.booking_events for select
  to authenticated
  using (
    audience = 'both'
    and student_id in (
      select sp.id from public.student_profiles sp where sp.user_id = auth.uid()
    )
  );

create policy "Service role insert booking_events"
  on public.booking_events for insert
  to service_role
  with check (true);

-- ---------------------------------------------------------------------------
-- 3. Append-only guard (blocks UPDATE/DELETE even when RLS is bypassed)
--    Dev reset may set: select set_config('quni.allow_booking_events_mutation', 'true', true);
-- ---------------------------------------------------------------------------
create or replace function public.trg_booking_events_append_only()
returns trigger
language plpgsql
as $$
begin
  if current_setting('quni.allow_booking_events_mutation', true) = 'true' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'booking_events is append-only (UPDATE/DELETE forbidden)'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists booking_events_append_only on public.booking_events;
create trigger booking_events_append_only
  before update or delete on public.booking_events
  for each row
  execute function public.trg_booking_events_append_only();

revoke update, delete on public.booking_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Insert helper (SECURITY DEFINER) — usable from triggers / RPC
-- ---------------------------------------------------------------------------
create or replace function public.insert_booking_event(
  p_event_type text,
  p_booking_id uuid,
  p_landlord_id uuid default null,
  p_student_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_audience text default 'internal',
  p_outcome text default 'n/a',
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_actor_label text default null,
  p_changes jsonb default null,
  p_reason text default null,
  p_provider text default null,
  p_provider_ref text default null,
  p_correlation_id text default null,
  p_document_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_schema_version smallint default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_landlord_id uuid := p_landlord_id;
  v_student_id uuid := p_student_id;
begin
  if p_booking_id is null then
    raise exception 'insert_booking_event: booking_id required';
  end if;

  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'insert_booking_event: event_type required';
  end if;

  -- Fill landlord/student from booking when omitted (trigger convenience + RLS).
  if v_landlord_id is null or v_student_id is null then
    select
      coalesce(v_landlord_id, b.landlord_id),
      coalesce(v_student_id, b.student_id)
    into v_landlord_id, v_student_id
    from public.bookings b
    where b.id = p_booking_id;
  end if;

  insert into public.booking_events (
    booking_id,
    landlord_id,
    student_id,
    event_type,
    occurred_at,
    audience,
    outcome,
    actor_type,
    actor_id,
    actor_label,
    changes,
    reason,
    provider,
    provider_ref,
    correlation_id,
    document_id,
    metadata,
    schema_version
  ) values (
    p_booking_id,
    v_landlord_id,
    v_student_id,
    trim(p_event_type),
    coalesce(p_occurred_at, now()),
    coalesce(nullif(trim(p_audience), ''), 'internal'),
    coalesce(nullif(trim(p_outcome), ''), 'n/a'),
    coalesce(nullif(trim(p_actor_type), ''), 'system'),
    p_actor_id,
    nullif(trim(p_actor_label), ''),
    p_changes,
    nullif(trim(p_reason), ''),
    nullif(trim(p_provider), ''),
    nullif(trim(p_provider_ref), ''),
    nullif(trim(p_correlation_id), ''),
    p_document_id,
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_schema_version, 1)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.insert_booking_event is
  'Append-only insert into booking_events. Preferred write path for triggers and service code.';

revoke all on function public.insert_booking_event(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid, text,
  jsonb, text, text, text, text, uuid, jsonb, smallint
) from public;

grant execute on function public.insert_booking_event(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid, text,
  jsonb, text, text, text, text, uuid, jsonb, smallint
) to service_role;

-- ---------------------------------------------------------------------------
-- 5. provider_webhook_health — gap monitor (a)
-- ---------------------------------------------------------------------------
create table if not exists public.provider_webhook_health (
  provider text primary key,
  last_received_at timestamptz,
  last_event_type text,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint provider_webhook_health_provider_check
    check (provider in ('resend', 'docuseal', 'stripe'))
);

comment on table public.provider_webhook_health is
  'Last successful webhook receipt per provider. Stale last_received_at must surface loudly in admin.';

insert into public.provider_webhook_health (provider, last_received_at, updated_at)
values
  ('resend', null, now()),
  ('docuseal', null, now()),
  ('stripe', null, now())
on conflict (provider) do nothing;

alter table public.provider_webhook_health enable row level security;

drop policy if exists "Platform admins select provider_webhook_health" on public.provider_webhook_health;
drop policy if exists "Service role upsert provider_webhook_health" on public.provider_webhook_health;

create policy "Platform admins select provider_webhook_health"
  on public.provider_webhook_health for select
  using (public.is_platform_admin());

-- Updates go through service role (webhooks / cron); no JWT write policy.
grant select on public.provider_webhook_health to authenticated;
grant select, insert, update on public.provider_webhook_health to service_role;

create or replace function public.touch_provider_webhook_health(
  p_provider text,
  p_event_type text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.provider_webhook_health as h (
    provider,
    last_received_at,
    last_event_type,
    last_error,
    updated_at
  ) values (
    p_provider,
    case when p_error is null then now() else null end,
    p_event_type,
    p_error,
    now()
  )
  on conflict (provider) do update set
    last_received_at = case
      when p_error is null then now()
      else h.last_received_at
    end,
    last_event_type = coalesce(p_event_type, h.last_event_type),
    last_error = p_error,
    updated_at = now();
end;
$$;

comment on function public.touch_provider_webhook_health is
  'Record webhook receipt (or error) for provider health monitoring.';

revoke all on function public.touch_provider_webhook_health(text, text, text) from public;
grant execute on function public.touch_provider_webhook_health(text, text, text) to service_role;
