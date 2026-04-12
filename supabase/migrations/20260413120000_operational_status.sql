-- Operational status rows for Admin → Apps (platform-health edge function + cron).
-- RLS: admins read via is_platform_admin(); service role bypasses RLS for upserts from Edge Functions.

create table if not exists public.operational_status (
  service_name text primary key,
  status text not null check (status in ('operational', 'degraded', 'down')),
  message text,
  checked_at timestamptz not null default now()
);

create index if not exists operational_status_checked_at_idx on public.operational_status (checked_at desc);

alter table public.operational_status enable row level security;

drop policy if exists "Platform admins select operational_status" on public.operational_status;

create policy "Platform admins select operational_status"
  on public.operational_status for select
  to authenticated
  using (public.is_platform_admin());
