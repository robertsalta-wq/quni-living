-- Append-only audit log for AI matching compliance and landlord review actions.
-- Apply via Supabase CLI / dashboard; service role inserts only.

create table if not exists public.ai_matching_compliance_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid references public.bookings (id) on delete set null,
  landlord_id uuid references public.landlord_profiles (id) on delete set null,
  student_id uuid references public.student_profiles (id) on delete set null,
  event_type text not null check (event_type in ('ai_assessment', 'landlord_confirm', 'landlord_decline')),
  ai_surface text,
  service_tier text check (service_tier is null or service_tier in ('listing', 'managed')),
  outcome text not null,
  decision_reason text,
  fit_vector jsonb not null default '{}'::jsonb,
  payload_field_keys jsonb not null default '[]'::jsonb,
  payload_hash text not null,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.ai_matching_compliance_audit is
  'Immutable compliance audit: fit-vector snapshot, allowlisted AI payload keys + hash, landlord review outcomes.';

create index if not exists ai_matching_compliance_audit_booking_id_idx
  on public.ai_matching_compliance_audit (booking_id);

create index if not exists ai_matching_compliance_audit_created_at_idx
  on public.ai_matching_compliance_audit (created_at desc);

alter table public.ai_matching_compliance_audit enable row level security;

-- Append-only for authenticated users: no select/insert/update/delete via client roles.
-- Inserts are performed with the service role from API handlers only.
