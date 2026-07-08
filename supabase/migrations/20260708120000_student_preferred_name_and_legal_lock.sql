BEGIN;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS preferred_name       text,
  ADD COLUMN IF NOT EXISTS legal_name_locked_at timestamptz;

UPDATE public.student_profiles
SET preferred_name = COALESCE(
      NULLIF(btrim(full_name), ''),
      NULLIF(btrim(concat_ws(' ', first_name, last_name)), '')
    )
WHERE preferred_name IS NULL;

COMMIT;
