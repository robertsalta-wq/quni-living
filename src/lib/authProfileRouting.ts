/**
 * Sync auth routing helpers — no supabase client import.
 * Safe for marketing chrome (Header / OnboardingResumeBanner) on the homepage critical path.
 */
import type { User } from '@supabase/supabase-js'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'
import { isLandlordPublishComplete } from './landlordProfileReadiness'
import { isRenterRole } from './marketplaceRole'
import { isShallowReturnIntentPath } from './postAuthRedirect'
import { renterOnboardingIncomplete } from './studentOnboarding'
import type { Database } from './database.types'

export type UserRole = 'renter' | 'landlord' | 'admin' | null

export { isRenterRole }

/** Incomplete renter onboarding lands on profile (section 0 / situation picker in later stages). */
export const INCOMPLETE_RENTER_DESTINATION = '/student-profile'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
export type AuthProfile = StudentProfileRow | LandlordProfileRow

/**
 * Default destination after login when no explicit `?redirect=` (or other meaningful return path) is used.
 * Renter: incomplete onboarding → /student-profile; complete → /student-dashboard.
 * Landlord → /landlord/dashboard (Profile tab when publish incomplete). Admin → /admin. No role → /onboarding.
 */
export function getPostLoginRedirectDestination(
  _user: User,
  role: UserRole,
  profile: AuthProfile | null,
): string {
  if (role === 'admin') return '/admin'
  if (role === 'landlord') {
    const lp = profile as LandlordProfileRow | null
    if (!lp || !isLandlordPublishComplete(lp)) return landlordDashboardProfilePath()
    return '/landlord/dashboard'
  }
  if (isRenterRole(role)) {
    const sp = profile as StudentProfileRow | null
    if (renterOnboardingIncomplete(sp, _user.id)) return INCOMPLETE_RENTER_DESTINATION
    return '/student-dashboard'
  }
  return '/onboarding'
}

/**
 * Dashboard URL for header / account nav. Unlike post-login redirect, completed students go to
 * `/student-dashboard` (not `/listings`).
 */
export function getNavDashboardPath(
  role: UserRole,
  profile: AuthProfile | null,
  userId?: string | null,
): string {
  if (role === 'admin') return '/admin'
  if (role === 'landlord') {
    return '/landlord/dashboard'
  }
  if (isRenterRole(role)) {
    const sp = profile as StudentProfileRow | null
    if (renterOnboardingIncomplete(sp, userId)) return INCOMPLETE_RENTER_DESTINATION
    return '/student-dashboard'
  }
  return '/onboarding'
}

/** Legacy helper - prefer `getPostLoginRedirectDestination` or `getNavDashboardPath` by context. */
export function getDashboardPath(role: UserRole): string {
  if (isRenterRole(role)) return '/student-dashboard'
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'admin') return '/admin'
  return '/onboarding'
}

/** True if user must still complete onboarding (role selection, profile row, or student onboarding). */
export function needsOnboarding(
  role: UserRole,
  profile: AuthProfile | null,
  userId?: string | null,
): boolean {
  if (role === 'admin') return false
  if (!role) return true
  if (profile === null) return true
  if (isRenterRole(role)) {
    return renterOnboardingIncomplete(profile as StudentProfileRow, userId)
  }
  if (role === 'landlord') {
    if (!profile) return true
    return !isLandlordPublishComplete(profile as LandlordProfileRow)
  }
  return false
}

/** Onboarding destination when `needsOnboarding` is true. */
export function getIncompleteOnboardingDestination(
  role: UserRole,
  profile: AuthProfile | null,
  userId?: string | null,
): string {
  if (!needsOnboarding(role, profile, userId)) {
    return '/onboarding'
  }
  if (!role) return '/onboarding'
  if (isRenterRole(role)) return INCOMPLETE_RENTER_DESTINATION
  if (role === 'landlord') return landlordDashboardProfilePath()
  return '/onboarding'
}

/** After email confirm or verify-email continue — onboarding when incomplete, else safe return path. */
export function getPostAuthEntryDestination(
  user: User,
  role: UserRole,
  profile: AuthProfile | null,
  fromPath?: string | null,
): string {
  if (role === 'admin') return '/admin'
  if (!role) return '/onboarding'
  if (isRenterRole(role) && renterOnboardingIncomplete(profile as StudentProfileRow | null, user.id)) {
    return INCOMPLETE_RENTER_DESTINATION
  }
  if (
    role === 'landlord' &&
    (!profile || !isLandlordPublishComplete(profile as LandlordProfileRow))
  ) {
    return landlordDashboardProfilePath()
  }
  const safeFrom =
    fromPath &&
    fromPath !== '/verify-email' &&
    fromPath.startsWith('/') &&
    !isShallowReturnIntentPath(fromPath)
      ? fromPath
      : null
  if (safeFrom) return safeFrom
  return getPostLoginRedirectDestination(user, role, profile)
}
