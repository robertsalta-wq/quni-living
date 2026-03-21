-- ============================================================
-- Public storage for landlord profile photos (a photo of yourself)
-- 1) Dashboard → Storage → New bucket → id: landlord-avatars → Public
--    (Bucket id unchanged for existing projects; it holds profile photos.)
-- 2) Run this in SQL Editor
-- ============================================================

drop policy if exists "Public read landlord avatars" on storage.objects;
drop policy if exists "Landlords upload own avatar folder" on storage.objects;
drop policy if exists "Landlords update own avatar folder" on storage.objects;
drop policy if exists "Landlords delete own avatar folder" on storage.objects;
drop policy if exists "Public read landlord profile photos" on storage.objects;
drop policy if exists "Landlords upload own profile photo folder" on storage.objects;
drop policy if exists "Landlords update own profile photo folder" on storage.objects;
drop policy if exists "Landlords delete own profile photo folder" on storage.objects;

create policy "Public read landlord profile photos"
  on storage.objects for select
  using (bucket_id = 'landlord-avatars');

create policy "Landlords upload own profile photo folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Landlords update own profile photo folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Landlords delete own profile photo folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
