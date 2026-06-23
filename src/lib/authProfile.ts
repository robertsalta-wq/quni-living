import type { User } from '@supabase/supabase-js'
import { landlordNeedsOnboardingWizard } from './landlordOnboarding'
import { fetchIsPlatformAdmin, linkPlatformStaffUserIfNeeded } from './platformStaff'
import { isShallowReturnIntentPath } from './postAuthRedirect'
import { renterOnboardingIncomplete } from './studentOnboarding'
import { supabase } from './supabase'
import type { Database } from './database.types'
import { isRenterRole } from './marketplaceRole'

export type UserRole = 'student' | 'renter' | 'landlord' | 'admin' | null

export { isRenterRole }

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
export type AuthProfile = StudentProfileRow | LandlordProfileRow

/** One in-flight role/profile resolution per user — shared by AuthContext and auth callback. */
const profileHydrateInflightByUserId = new Map<
  string,
  Promise<{ role: UserRole; profile: AuthProfile | null }>
>()

const profileRowsInflightByUserId = new Map<
  string,
  Promise<{ sp: StudentProfileRow | null; lp: LandlordProfileRow | null }>
>()

export async function fetchProfileRows(userId: string): Promise<{
  sp: StudentProfileRow | null
  lp: LandlordProfileRow | null
}> {
  const [{ data: spRaw }, { data: lpRaw }] = await Promise.all([
    supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('landlord_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ])
  return {
    sp: spRaw as StudentProfileRow | null,
    lp: lpRaw as LandlordProfileRow | null,
  }
}

export function fetchProfileRowsDeduped(userId: string): Promise<{
  sp: StudentProfileRow | null
  lp: LandlordProfileRow | null
}> {
  const existing = profileRowsInflightByUserId.get(userId)
  if (existing) return existing

  const inflight = fetchProfileRows(userId).finally(() => {
    if (profileRowsInflightByUserId.get(userId) === inflight) {
      profileRowsInflightByUserId.delete(userId)
    }
  })
  profileRowsInflightByUserId.set(userId, inflight)
  return inflight
}

export function getProfileHydrateInflight(
  userId: string,
): Promise<{ role: UserRole; profile: AuthProfile | null }> | undefined {
  return profileHydrateInflightByUserId.get(userId)
}

export function setProfileHydrateInflight(
  userId: string,
  inflight: Promise<{ role: UserRole; profile: AuthProfile | null }>,
): void {
  profileHydrateInflightByUserId.set(userId, inflight)
  inflight.finally(() => {
    if (profileHydrateInflightByUserId.get(userId) === inflight) {
      profileHydrateInflightByUserId.delete(userId)
    }
  })
}

export function deleteProfileHydrateInflight(userId: string): void {
  profileHydrateInflightByUserId.delete(userId)
}

export function clearProfileHydrateInflight(): void {
  profileHydrateInflightByUserId.clear()
}

/**
 * Role resolution from already-loaded rows:
 * 1. If metadata role has a matching profile row, trust that pair.
 * 2. If metadata is stale/mismatched, trust whichever profile row exists.
 * 3. If neither profile exists, fall back to metadata role (onboarding can create row).
 */
export function resolveRoleAndProfileFromRows(
  user: User,
  sp: StudentProfileRow | null,
  lp: LandlordProfileRow | null,
): { role: UserRole; profile: AuthProfile | null } {
  const meta = user.user_metadata?.role
  if (isRenterRole(meta) || meta === 'landlord') {
    if (isRenterRole(meta) && sp) return { role: 'renter', profile: sp }
    if (meta === 'landlord' && lp) return { role: 'landlord', profile: lp }
  }
  if (sp) return { role: 'renter', profile: sp }
  if (lp) return { role: 'landlord', profile: lp }
  if (isRenterRole(meta)) return { role: 'renter', profile: null }
  if (meta === 'landlord') return { role: 'landlord', profile: null }
  return { role: null, profile: null }
}

async function loadRoleAndProfileCore(user: User): Promise<{
  role: UserRole
  profile: AuthProfile | null
}> {
  const meta = user.user_metadata?.role
  const metaIsKnownRole = isRenterRole(meta) || meta === 'landlord'
  const mayBePlatformAdmin = meta === 'admin' || !metaIsKnownRole
  if (mayBePlatformAdmin && (meta === 'admin' || (await fetchIsPlatformAdmin()))) {
    await linkPlatformStaffUserIfNeeded(user)
    return { role: 'admin', profile: null }
  }

  const { sp, lp } = await fetchProfileRowsDeduped(user.id)
  return resolveRoleAndProfileFromRows(user, sp, lp)
}

export async function fetchRoleAndProfile(user: User): Promise<{
  role: UserRole
  profile: AuthProfile | null
}> {
  const hydrateInflight = profileHydrateInflightByUserId.get(user.id)
  if (hydrateInflight) return hydrateInflight
  return loadRoleAndProfileCore(user)
}

export function fetchRoleAndProfileDeduped(
  user: User,
): Promise<{ role: UserRole; profile: AuthProfile | null }> {
  const userId = user.id
  const existing = profileHydrateInflightByUserId.get(userId)
  if (existing) return existing

  const inflight = loadRoleAndProfileCore(user)
  setProfileHydrateInflight(userId, inflight)
  return inflight
}

/**
 * Default destination after login when no explicit `?redirect=` (or other meaningful return path) is used.
 * Student: incomplete onboarding → /onboarding/student; complete → /student-dashboard.
 * Landlord → /onboarding/landlord until wizard complete, then /landlord-dashboard. Admin → /admin. No role → /onboarding.
 */
export function getPostLoginRedirectDestination(
  _user: User,
  role: UserRole,
  profile: AuthProfile | null,
): string {
  if (role === 'admin') return '/admin'
  if (role === 'landlord') {
    const lp = profile as LandlordProfileRow | null
    if (!lp || landlordNeedsOnboardingWizard(lp)) return '/onboarding/landlord'
    return '/landlord-dashboard'
  }
  if (isRenterRole(role)) {
    const sp = profile as StudentProfileRow | null
    if (renterOnboardingIncomplete(sp, _user.id)) return '/onboarding/student'
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
    const lp = profile as LandlordProfileRow | null
    if (!lp || landlordNeedsOnboardingWizard(lp)) return '/onboarding/landlord'
    return '/landlord/dashboard'
  }
  if (isRenterRole(role)) {
    const sp = profile as StudentProfileRow | null
    if (renterOnboardingIncomplete(sp, userId)) return '/onboarding/student'
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
    return landlordNeedsOnboardingWizard(profile as LandlordProfileRow)
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
  if (isRenterRole(role)) return '/onboarding/student'
  if (role === 'landlord') return '/onboarding/landlord'
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
    return '/onboarding/student'
  }
  if (
    role === 'landlord' &&
    (!profile || landlordNeedsOnboardingWizard(profile as LandlordProfileRow))
  ) {
    return '/onboarding/landlord'
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
