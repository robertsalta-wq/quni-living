-- Visa uploads use student-documents/visa/{user_id}/… (runVisaDocUpload.ts).
-- Baseline student-documents policies require foldername[1] = auth.uid(); visa paths need segment 2.
-- Already applied in production (hotfix); idempotent for ledger sync on staging/local.

drop policy if exists "Students upload own visa docs" on storage.objects;
drop policy if exists "Students update own visa docs" on storage.objects;
drop policy if exists "Students read own visa docs" on storage.objects;

create policy "Students upload own visa docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = 'visa'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Students update own visa docs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = 'visa'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = 'visa'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Students read own visa docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = 'visa'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
