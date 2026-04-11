-- Allow bond receipt PDFs for boarding/lodger arrangements (landlord-held bond).

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
      'other'
    )
  );
