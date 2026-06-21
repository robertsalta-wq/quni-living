-- Append-only journey log for support timelines (booking attempts, rejections, etc.).
-- Inserts via service role only; platform admins read via RLS.
-- Rob applies to prod before deploying code that writes to this table.

create table public.journey_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  email text,
  attempt_id uuid,
  property_id uuid,
  event_type text not null,
  step text,
  error_code text,
  http_status integer,
  service_tier text,
  source text not null default 'server',
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.journey_events is
  'Append-only user journey events for support timelines; event_type is free text (no enum).';

create index journey_events_user_id_idx on public.journey_events (user_id);

create index journey_events_email_lower_idx on public.journey_events (lower(email));

create index journey_events_attempt_id_idx on public.journey_events (attempt_id);

create index journey_events_created_at_idx on public.journey_events (created_at desc);

create index journey_events_event_type_idx on public.journey_events (event_type);

alter table public.journey_events enable row level security;

create policy "Platform admins read journey events"
  on public.journey_events for select
  to authenticated
  using (public.is_platform_admin());
