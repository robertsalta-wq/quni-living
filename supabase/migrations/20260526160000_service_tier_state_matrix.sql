-- Per-state × property-tier Managed availability (Admin → State workflows).

create table if not exists public.service_tier_state_matrix (
  id uuid primary key default gen_random_uuid(),
  state_code text not null check (state_code in ('NSW', 'QLD', 'VIC', 'DEFAULT')),
  property_tier text not null check (property_tier in ('t1', 't2', 't3')),
  managed_status text not null check (managed_status in ('available', 'gated', 'unsupported')),
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint service_tier_state_matrix_state_tier_key unique (state_code, property_tier)
);

comment on table public.service_tier_state_matrix is
  'Admin-editable Managed tier availability per state × property tier. DEFAULT = all non-NSW/QLD/VIC states.';
comment on column public.service_tier_state_matrix.state_code is
  'NSW, QLD, VIC, or DEFAULT (other Australian states).';
comment on column public.service_tier_state_matrix.property_tier is
  'Property tier: t1 hosted room, t2 private RTA, t3 rooming house.';

drop trigger if exists service_tier_state_matrix_set_updated_at on public.service_tier_state_matrix;
create trigger service_tier_state_matrix_set_updated_at
  before update on public.service_tier_state_matrix
  for each row execute function public.set_updated_at();

-- Seed from code defaults (api/lib/serviceTier/*.ts)
insert into public.service_tier_state_matrix (state_code, property_tier, managed_status, notes)
values
  ('NSW', 't1', 'available', null),
  ('NSW', 't2', 'gated', 'Managed currently unavailable in NSW Tier 2'),
  ('NSW', 't3', 'unsupported', null),
  ('QLD', 't1', 'available', null),
  ('QLD', 't2', 'available', null),
  ('QLD', 't3', 'unsupported', null),
  ('VIC', 't1', 'gated', 'Managed unavailable until trust accounts are operational and Victorian licensing requirements are satisfied'),
  ('VIC', 't2', 'gated', 'Managed unavailable until trust accounts are operational and Victorian licensing requirements are satisfied'),
  ('VIC', 't3', 'unsupported', null),
  ('DEFAULT', 't1', 'unsupported', null),
  ('DEFAULT', 't2', 'unsupported', null),
  ('DEFAULT', 't3', 'unsupported', null)
on conflict (state_code, property_tier) do nothing;

alter table public.service_tier_state_matrix enable row level security;

drop policy if exists "Service tier matrix readable by all" on public.service_tier_state_matrix;
create policy "Service tier matrix readable by all"
  on public.service_tier_state_matrix for select
  to anon, authenticated
  using (true);

drop policy if exists "Service tier matrix writable by admins" on public.service_tier_state_matrix;
create policy "Service tier matrix writable by admins"
  on public.service_tier_state_matrix for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select on public.service_tier_state_matrix to anon, authenticated;
