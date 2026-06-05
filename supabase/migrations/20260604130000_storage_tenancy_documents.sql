-- =============================================================================
-- tenancy-documents storage bucket + RLS policies
-- Reconstructed from the live Tokyo project (flegysnshryzvkwzfclc) baseline,
-- captured 28 May 2026. These policies had NO source in the repo - the live
-- project was the only source of truth. This file makes them replayable so the
-- Sydney project (and any future project) has them in version control.
--
-- Idempotent: safe to re-run (DROP IF EXISTS before each CREATE).
-- Depends on: tenancies, landlord_profiles, student_profiles tables existing.
-- =============================================================================

-- Bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenancy-documents', 'tenancy-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Service role: full access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenancy docs: service role all" ON storage.objects;
CREATE POLICY "Tenancy docs: service role all"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'tenancy-documents')
WITH CHECK (bucket_id = 'tenancy-documents');

-- ---------------------------------------------------------------------------
-- Landlords: read/insert/update/delete files in folders for their own tenancies
-- Folder convention: first path segment = tenancy id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenancy docs: landlords read own tenancy folders" ON storage.objects;
CREATE POLICY "Tenancy docs: landlords read own tenancy folders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN landlord_profiles lp ON lp.id = t.landlord_profile_id
    WHERE lp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenancy docs: landlords insert own tenancy folders" ON storage.objects;
CREATE POLICY "Tenancy docs: landlords insert own tenancy folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN landlord_profiles lp ON lp.id = t.landlord_profile_id
    WHERE lp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenancy docs: landlords update own tenancy folders" ON storage.objects;
CREATE POLICY "Tenancy docs: landlords update own tenancy folders"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN landlord_profiles lp ON lp.id = t.landlord_profile_id
    WHERE lp.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN landlord_profiles lp ON lp.id = t.landlord_profile_id
    WHERE lp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenancy docs: landlords delete own tenancy folders" ON storage.objects;
CREATE POLICY "Tenancy docs: landlords delete own tenancy folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN landlord_profiles lp ON lp.id = t.landlord_profile_id
    WHERE lp.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Students: read files in folders for their own tenancies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenancy docs: students read own tenancy folders" ON storage.objects;
CREATE POLICY "Tenancy docs: students read own tenancy folders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT t.id::text
    FROM tenancies t
    JOIN student_profiles sp ON sp.id = t.student_profile_id
    WHERE sp.user_id = auth.uid()
  )
);
