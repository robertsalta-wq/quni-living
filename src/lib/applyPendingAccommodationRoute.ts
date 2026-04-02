import { supabase } from './supabase'
import { clearQuniAccommodationVerificationRoute, getQuniAccommodationVerificationRoute } from './quniAccommodationRoute'

const RECENT_SIGNUP_MS = 30 * 60 * 1000

/**
 * Google (and other OAuth) sign-up cannot attach extra user_metadata from the client.
 * After the first session is established, copy the signup choice from localStorage onto
 * student_profiles when the row still has a null route.
 *
 * Only runs for accounts created recently so a stale localStorage value cannot overwrite
 * legacy rows after an unrelated login.
 */
export async function applyPendingAccommodationRouteToStudentProfile(
  userId: string,
  userCreatedAt: string | undefined,
): Promise<void> {
  const route = getQuniAccommodationVerificationRoute()
  if (!route) return

  if (userCreatedAt) {
    const created = new Date(userCreatedAt).getTime()
    if (!Number.isFinite(created) || Date.now() - created > RECENT_SIGNUP_MS) {
      clearQuniAccommodationVerificationRoute()
      return
    }
  }

  const { data: row, error: selErr } = await supabase
    .from('student_profiles')
    .select('accommodation_verification_route')
    .eq('user_id', userId)
    .maybeSingle()

  if (selErr || !row) return

  if (row.accommodation_verification_route != null) {
    clearQuniAccommodationVerificationRoute()
    return
  }

  const { error: upErr } = await supabase
    .from('student_profiles')
    .update({ accommodation_verification_route: route })
    .eq('user_id', userId)

  if (!upErr) clearQuniAccommodationVerificationRoute()
}
