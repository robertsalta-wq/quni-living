-- ============================================================
-- Public storage for student profile photos (a photo of yourself)
-- 1) Dashboard → Storage → New bucket → id: student-avatars → Public
--    (Bucket id unchanged for existing projects; it holds profile photos.)
-- 2) Run this in SQL Editor
-- ============================================================

drop policy if exists "Public read student avatars" on storage.objects;
drop policy if exists "Students upload own avatar folder" on storage.objects;
drop policy if exists "Students update own avatar folder" on storage.objects;
drop policy if exists "Students delete own avatar folder" on storage.objects;
drop policy if exists "Public read student profile photos" on storage.objects;
drop policy if exists "Students upload own profile photo folder" on storage.objects;
drop policy if exists "Students update own profile photo folder" on storage.objects;
drop policy if exists "Students delete own profile photo folder" on storage.objects;

create policy "Public read student profile photos"
  on storage.objects for select
  using (bucket_id = 'student-avatars');

create policy "Students upload own profile photo folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students update own profile photo folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students delete own profile photo folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
