-- Incident log for platform health (cron inserts; admins comment / resolve).
-- RLS: platform admins read + update; service role bypasses RLS for inserts from Edge Functions.

create table if not exists public.incident_log (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  status text not null,
  message text,
  comment text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists incident_log_created_at_idx on public.incident_log (created_at desc);

create index if not exists incident_log_service_unresolved_idx
  on public.incident_log (service_name, created_at desc)
  where resolved_at is null;

alter table public.incident_log enable row level security;

drop policy if exists "Platform admins select incident_log" on public.incident_log;
drop policy if exists "Platform admins update incident_log" on public.incident_log;

create policy "Platform admins select incident_log"
  on public.incident_log for select
  to authenticated
  using (public.is_platform_admin());

create policy "Platform admins update incident_log"
  on public.incident_log for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
