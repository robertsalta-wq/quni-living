-- Co-tenant DocuSeal signature tracking (second named tenant on lease).

alter table public.tenancy_documents
  add column if not exists co_tenant_signed_at timestamptz;

comment on column public.tenancy_documents.co_tenant_signed_at is
  'When the co-tenant (second named tenant) completed e-signing, if the booking has occupant_count >= 2.';
