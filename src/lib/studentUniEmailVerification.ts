import type { StudentProfileRow } from './studentOnboarding'
import { isNonStudentAccommodationRoute } from './studentOnboarding'

/** Student accommodation path must verify a university email before profile onboarding. */
export function needsStudentUniEmailVerification(
  profile: StudentProfileRow | null | undefined,
): boolean {
  if (!profile) return false
  if (isNonStudentAccommodationRoute(profile.accommodation_verification_route)) return false
  return profile.uni_email_verified !== true
}

export function isStudentUniEmailVerified(profile: StudentProfileRow | null | undefined): boolean {
  return Boolean(profile?.uni_email_verified && profile?.uni_email)
}
