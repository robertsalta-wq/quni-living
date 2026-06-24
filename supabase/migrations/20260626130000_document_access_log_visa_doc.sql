-- Allow visa document opens in document_access_log (admin-only drawer link).
-- Rob runs this in prod before deploy that logs visa_doc access.

alter table public.document_access_log
  drop constraint if exists document_access_log_document_type_check;

alter table public.document_access_log
  add constraint document_access_log_document_type_check check (
    document_type in (
      'id_document',
      'enrolment_doc',
      'identity_supporting_doc',
      'visa_doc'
    )
  );
