-- Terminate-agreement primitive: distinct from pre-tenancy cancelled/expired.
-- Listing mutual-surrender first delivery (Kim / whole-unit conversion path).

-- ---------------------------------------------------------------------------
-- bookings.status: terminating (reserved until effective date) + terminated
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending',
      'pending_payment',
      'pending_confirmation',
      'awaiting_info',
      'bond_pending',
      'confirmed',
      'active',
      'terminating',
      'terminated',
      'completed',
      'cancelled',
      'declined',
      'expired',
      'payment_failed'
    )
  );

-- ---------------------------------------------------------------------------
-- Termination + bond-outcome columns on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists termination_type text;
alter table public.bookings add column if not exists termination_effective_date date;
alter table public.bookings add column if not exists termination_reason_note text;
alter table public.bookings add column if not exists termination_initiated_by text;
alter table public.bookings add column if not exists termination_acknowledged_at timestamptz;
alter table public.bookings add column if not exists termination_initiated_at timestamptz;
alter table public.bookings add column if not exists bond_outcome text;
alter table public.bookings add column if not exists bond_outcome_note text;

alter table public.bookings drop constraint if exists bookings_termination_type_check;
alter table public.bookings
  add constraint bookings_termination_type_check check (
    termination_type is null
    or termination_type in (
      'mutual_surrender',
      'tenant_notice',
      'landlord_grounds',
      'breach',
      'end_of_term'
    )
  );

alter table public.bookings drop constraint if exists bookings_termination_initiated_by_check;
alter table public.bookings
  add constraint bookings_termination_initiated_by_check check (
    termination_initiated_by is null
    or termination_initiated_by in ('landlord', 'tenant', 'admin')
  );

alter table public.bookings drop constraint if exists bookings_bond_outcome_check;
alter table public.bookings
  add constraint bookings_bond_outcome_check check (
    bond_outcome is null
    or bond_outcome in (
      'pending',
      'transferred',
      'refunded',
      'retained_by_agreement',
      'never_lodged',
      'na'
    )
  );

comment on column public.bookings.termination_type is
  'Legal category for ending a live agreement (distinct from pre-tenancy cancel).';
comment on column public.bookings.termination_effective_date is
  'Date the agreement ends; listing stays reserved while status=terminating until this date.';
comment on column public.bookings.termination_acknowledged_at is
  'When both parties e-signed mutual surrender (null for label-only types until ops expands).';
comment on column public.bookings.bond_outcome is
  'External bond outcome checklist; platform never moves bond money.';

create index if not exists bookings_terminating_effective_date_idx
  on public.bookings (termination_effective_date)
  where status = 'terminating';

-- ---------------------------------------------------------------------------
-- tenancy_documents: mutual_termination package
-- ---------------------------------------------------------------------------
alter table public.tenancy_documents
  drop constraint if exists tenancy_documents_document_type_check;

alter table public.tenancy_documents
  add constraint tenancy_documents_document_type_check
  check (
    document_type in (
      'lease',
      'condition_report_ingoing',
      'condition_report_outgoing',
      'breach_notice',
      'termination_notice',
      'mutual_termination',
      'rent_increase_notice',
      'bond_lodgement',
      'bond_receipt',
      'residential_tenancy',
      'other'
    )
  );
