import type { User } from '@supabase/supabase-js'
import { fetchIsPlatformAdmin, linkPlatformStaffUserIfNeeded } from './platformStaff'
import { supabase } from './supabase'
import { isRenterRole } from './marketplaceRole'
import type {
  AuthProfile,
  LandlordProfileRow,
  StudentProfileRow,
  UserRole,
} from './authProfileRouting'

export type {
  AuthProfile,
  LandlordProfileRow,
  StudentProfileRow,
  UserRole,
} from './authProfileRouting'

export {
  INCOMPLETE_RENTER_DESTINATION,
  getDashboardPath,
  getIncompleteOnboardingDestination,
  getNavDashboardPath,
  getPostAuthEntryDestination,
  getPostLoginRedirectDestination,
  isRenterRole,
  needsOnboarding,
} from './authProfileRouting'

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
  // Never trust user_metadata for admin — verify against platform_staff via RPC.
  // Known renter/landlord users skip the RPC (perf); everyone else is checked.
  if (!metaIsKnownRole && (await fetchIsPlatformAdmin())) {
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
