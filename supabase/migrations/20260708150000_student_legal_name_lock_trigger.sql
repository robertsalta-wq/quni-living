BEGIN;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS legal_name_set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_name_set_at timestamptz;

CREATE OR REPLACE FUNCTION public.prevent_locked_legal_name_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legal_name_locked_at IS NOT NULL
     AND (NEW.first_name IS DISTINCT FROM OLD.first_name
          OR NEW.last_name IS DISTINCT FROM OLD.last_name)
     AND auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'legal_name_locked: first_name/last_name cannot be changed after identity verification'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_legal_name_edit ON public.student_profiles;
CREATE TRIGGER prevent_locked_legal_name_edit
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_legal_name_edit();

COMMIT;
