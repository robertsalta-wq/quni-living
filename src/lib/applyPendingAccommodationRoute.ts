import { clearQuniAccommodationVerificationRoute } from './quniAccommodationRoute'

/**
 * Pre-auth accommodation route resolution is retired (Stage 1).
 * Route is chosen on the profile after signup, not at signup/OAuth.
 */
export function resolvePendingAccommodationVerificationRoute(
  _userCreatedAt?: string,
  _metadataRoute?: unknown,
  _urlRoute?: 'student' | 'non_student' | null,
): null {
  return null
}

/**
 * No-op: clears stale signup localStorage only. Does not write route to student_profiles.
 */
export async function applyPendingAccommodationRouteToStudentProfile(
  _userId: string,
  _userCreatedAt?: string,
  _metadataRoute?: unknown,
  _urlRoute?: 'student' | 'non_student' | null,
): Promise<boolean> {
  clearQuniAccommodationVerificationRoute()
  return false
}
