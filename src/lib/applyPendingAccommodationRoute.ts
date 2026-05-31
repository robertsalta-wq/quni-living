import { supabase } from './supabase'
import {
  clearQuniAccommodationVerificationRoute,
  getQuniAccommodationVerificationRoute,
  type QuniAccommodationVerificationRoute,
} from './quniAccommodationRoute'

const RECENT_SIGNUP_MS = 30 * 60 * 1000

function isRecentSignup(userCreatedAt: string | undefined): boolean {
  if (!userCreatedAt) return true
  const created = new Date(userCreatedAt).getTime()
  if (!Number.isFinite(created)) return true
  return Date.now() - created <= RECENT_SIGNUP_MS
}

function parseMetadataRoute(value: unknown): QuniAccommodationVerificationRoute | null {
  if (value === 'student' || value === 'non_student') return value
  return null
}

/**
 * Route chosen at signup: localStorage (recent OAuth) or auth user_metadata (email signup).
 * localStorage is ignored after 30 minutes so a stale choice cannot overwrite an existing profile.
 */
export function resolvePendingAccommodationVerificationRoute(
  userCreatedAt: string | undefined,
  metadataRoute?: unknown,
): QuniAccommodationVerificationRoute | null {
  const fromMeta = parseMetadataRoute(metadataRoute)
  const fromStorage = getQuniAccommodationVerificationRoute()

  if (fromStorage) {
    if (isRecentSignup(userCreatedAt)) return fromStorage
    clearQuniAccommodationVerificationRoute()
  }

  return fromMeta
}

/**
 * Google (and other OAuth) sign-up cannot attach extra user_metadata from the client.
 * After the first session is established, copy the signup choice onto student_profiles when
 * the row still has a null route.
 */
export async function applyPendingAccommodationRouteToStudentProfile(
  userId: string,
  userCreatedAt: string | undefined,
  metadataRoute?: unknown,
): Promise<boolean> {
  const route = resolvePendingAccommodationVerificationRoute(userCreatedAt, metadataRoute)
  if (!route) return false

  const { data: row, error: selErr } = await supabase
    .from('student_profiles')
    .select('accommodation_verification_route')
    .eq('user_id', userId)
    .maybeSingle()

  if (selErr || !row) return false

  if (row.accommodation_verification_route != null) {
    clearQuniAccommodationVerificationRoute()
    return false
  }

  const { error: upErr } = await supabase
    .from('student_profiles')
    .update({ accommodation_verification_route: route })
    .eq('user_id', userId)

  if (!upErr) clearQuniAccommodationVerificationRoute()
  return !upErr
}
