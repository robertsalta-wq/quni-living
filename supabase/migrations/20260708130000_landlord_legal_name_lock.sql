BEGIN;

ALTER TABLE public.landlord_profiles
  ADD COLUMN IF NOT EXISTS legal_name_locked_at timestamptz;

COMMIT;
