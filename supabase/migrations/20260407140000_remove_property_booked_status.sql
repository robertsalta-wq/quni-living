-- Stop using properties.status = 'booked'. Availability is determined from bookings (date-aware).
-- Reset existing rows and tighten CHECK. Keeps suspended/draft (admin + landlord flows).

UPDATE public.properties
SET status = 'active'
WHERE status = 'booked';

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('active', 'inactive', 'pending', 'suspended', 'draft'));

-- Public read: active listings only (booked status removed).
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;

CREATE POLICY "Public can view active properties"
  ON public.properties FOR SELECT
  USING (
    status = 'active'
    AND (
      auth.uid() IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.landlord_profiles lp
        WHERE lp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.user_id = auth.uid()
          AND sp.verification_type = 'student'
      )
      OR coalesce(open_to_non_students, false) = true
    )
  );

-- RPC: visible listings for students/guests are active only.
CREATE OR REPLACE FUNCTION public.property_access_status_for_viewer(p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  st public.properties%rowtype;
  vtype text;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN 'not_found';
  END IF;

  SELECT * INTO st
  FROM public.properties p
  WHERE p.slug = trim(p_slug)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF st.status IS DISTINCT FROM 'active' THEN
    RETURN 'not_found';
  END IF;

  IF uid IS NULL THEN
    RETURN 'ok';
  END IF;

  IF EXISTS (SELECT 1 FROM public.landlord_profiles lp WHERE lp.user_id = uid) THEN
    RETURN 'ok';
  END IF;

  SELECT sp.verification_type INTO vtype
  FROM public.student_profiles sp
  WHERE sp.user_id = uid
  LIMIT 1;

  IF coalesce(vtype, 'none') = 'student' OR coalesce(st.open_to_non_students, false) = true THEN
    RETURN 'ok';
  END IF;

  RETURN 'forbidden_student_only';
END;
$$;

CREATE OR REPLACE FUNCTION public.property_access_status_for_viewer_by_id(p_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  st public.properties%rowtype;
  vtype text;
BEGIN
  IF p_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  SELECT * INTO st FROM public.properties p WHERE p.id = p_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF st.status IS DISTINCT FROM 'active' THEN
    RETURN 'not_found';
  END IF;

  IF uid IS NULL THEN
    RETURN 'ok';
  END IF;

  IF EXISTS (SELECT 1 FROM public.landlord_profiles lp WHERE lp.user_id = uid) THEN
    RETURN 'ok';
  END IF;

  SELECT sp.verification_type INTO vtype
  FROM public.student_profiles sp
  WHERE sp.user_id = uid
  LIMIT 1;

  IF coalesce(vtype, 'none') = 'student' OR coalesce(st.open_to_non_students, false) = true THEN
    RETURN 'ok';
  END IF;

  RETURN 'forbidden_student_only';
END;
$$;

COMMENT ON FUNCTION public.property_access_status_for_viewer(text) IS
  'For UI: ok | not_found | forbidden_student_only for active listings vs current viewer.';

COMMENT ON FUNCTION public.property_access_status_for_viewer_by_id(uuid) IS
  'For UI: same as property_access_status_for_viewer(slug) but by property id; active listings only.';
