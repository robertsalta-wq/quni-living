-- ============================================================
-- Public avatars for landlord profile photos
-- 1) Dashboard → Storage → New bucket → id: landlord-avatars → Public
-- 2) Run this in SQL Editor (adjust bucket name if you chose another)
-- ============================================================

-- If bucket was created in UI, skip insert. Otherwise:
-- insert into storage.buckets (id, name, public) values ('landlord-avatars', 'landlord-avatars', true);

drop policy if exists "Public read landlord avatars" on storage.objects;
drop policy if exists "Landlords upload own avatar folder" on storage.objects;
drop policy if exists "Landlords update own avatar folder" on storage.objects;
drop policy if exists "Landlords delete own avatar folder" on storage.objects;

create policy "Public read landlord avatars"
  on storage.objects for select
  using (bucket_id = 'landlord-avatars');

create policy "Landlords upload own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Landlords update own avatar folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Landlords delete own avatar folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'landlord-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
