-- NSW residential tenancy signing package (FT6600 + Quni addendum) and housemates for max occupants.

alter table public.bookings add column if not exists housemates_count integer;

comment on column public.bookings.housemates_count is
  'Additional occupants (housemates) excluding the primary tenant; used with NSW RTA max occupants (housemates_count + 1).';

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
      'rent_increase_notice',
      'bond_lodgement',
      'bond_receipt',
      'residential_tenancy',
      'other'
    )
  );
 