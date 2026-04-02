-- One active OTP per user (avoids stale rows + makes upsert safe).
-- Run once in Supabase SQL Editor after student_verification.sql.

-- Remove duplicates, keep newest per user
DELETE FROM public.verification_otps a
USING public.verification_otps b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS verification_otps_user_id_key ON public.verification_otps (user_id);
