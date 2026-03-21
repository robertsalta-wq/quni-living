-- Public listing photos: bucket id **property-images** (create as Public in Dashboard first).
-- Run in SQL Editor after the bucket exists.

drop policy if exists "Public read property images" on storage.objects;
drop policy if exists "Auth upload property images own folder" on storage.objects;
drop policy if exists "Auth update property images own folder" on storage.objects;
drop policy if exists "Auth delete property images own folder" on storage.objects;

create policy "Public read property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Auth upload property images own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth update property images own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth delete property images own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
