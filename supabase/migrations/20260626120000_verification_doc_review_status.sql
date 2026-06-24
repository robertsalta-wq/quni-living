-- Per-document verification review state for renter profile §02 rows.
-- Rob runs this in prod before deploy that reads these columns.

alter table public.student_profiles
  add column if not exists id_document_verified_at timestamptz,
  add column if not exists id_document_review_status text
    check (id_document_review_status is null or id_document_review_status = 'in_review'),
  add column if not exists enrolment_doc_verified_at timestamptz,
  add column if not exists enrolment_doc_review_status text
    check (enrolment_doc_review_status is null or enrolment_doc_review_status = 'in_review'),
  add column if not exists identity_supporting_doc_verified_at timestamptz,
  add column if not exists identity_supporting_doc_review_status text
    check (identity_supporting_doc_review_status is null or identity_supporting_doc_review_status = 'in_review'),
  add column if not exists visa_doc_verified_at timestamptz,
  add column if not exists visa_doc_review_status text
    check (visa_doc_review_status is null or visa_doc_review_status = 'in_review');

comment on column public.student_profiles.id_document_verified_at is
  'Set when platform staff verify the government photo ID; locks self-replace in profile UI.';
comment on column public.student_profiles.id_document_review_status is
  'in_review while staff are reviewing the uploaded ID; null otherwise.';
comment on column public.student_profiles.visa_doc_verified_at is
  'Set when platform staff verify the visa document; locks self-replace in profile UI.';
comment on column public.student_profiles.visa_doc_review_status is
  'in_review while staff are reviewing the uploaded visa; null otherwise.';
