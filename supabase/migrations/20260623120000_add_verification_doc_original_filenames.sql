-- Store the user's original filename for each verification document so the UI can
-- display "payslip-april.pdf" instead of the generic storage name
-- ("identity-supporting-doc.pdf"), making a replaced document visibly distinct.
-- Idempotent: already applied to the AU project via the dashboard; this records it
-- in the repo so local/prod migration history stay in sync.
alter table public.student_profiles
  add column if not exists id_document_name text,
  add column if not exists enrolment_doc_name text,
  add column if not exists identity_supporting_doc_name text;
