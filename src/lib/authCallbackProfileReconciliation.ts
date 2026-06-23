import type { User } from '@supabase/supabase-js'
import { resolvePendingAccommodationVerificationRoute } from './applyPendingAccommodationRoute'
import {
  fetchProfileRowsDeduped,
  getProfileHydrateInflight,
  isRenterRole,
  resolveRoleAndProfileFromRows,
  setProfileHydrateInflight,
  type AuthProfile,
  type LandlordProfileRow,
  type StudentProfileRow,
  type UserRole,
} from './authProfile'
import { fetchIsPlatformAdmin, linkPlatformStaffUserIfNeeded } from './platformStaff'
import {
  clearQuniAccommodationVerificationRoute,
  getQuniAccommodationVerificationRoute,
  type QuniAccommodationVerificationRoute,
} from './quniAccommodationRoute'
import { clearQuniSelectedRole, getQuniSelectedRole } from './quniSelectedRole'
import { marketplaceRoleForWrite } from './marketplaceRole'
import { supabase } from './supabase'

const RECENT_SIGNUP_MS = 30 * 60 * 1000

function isRecentSignup(userCreatedAt: string | undefined): boolean {
  if (!userCreatedAt) return true
  const created = new Date(userCreatedAt).getTime()
  if (!Number.isFinite(created)) return true
  return Date.now() - created <= RECENT_SIGNUP_MS
}

function displayNameFromUser(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    ''
  )
}

function accommodationRouteFromUser(user: User): QuniAccommodationVerificationRoute | null {
  const route = user.user_metadata?.accommodation_verification_route
  if (route === 'student' || route === 'non_student') return route
  if (route === 'identity') return 'non_student'
  return null
}

export type AuthCallbackReconcileOptions = {
  afterSignupEmailConfirm: boolean
  urlRoute: QuniAccommodationVerificationRoute | null
  urlRole: 'student' | 'renter' | 'landlord' | null
}

/** Skip OAuth role reconciliation when email signup already established a student row. */
export function shouldSkipApplyPendingSignupRole(
  metaRole: unknown,
  sp: StudentProfileRow | null,
): boolean {
  return isRenterRole(metaRole) && sp != null
}

/**
 * In-memory route apply: update only when the student row exists and route is still null.
 * Returns updated row and whether localStorage should be cleared (matches applyPendingAccommodationRoute).
 */
export function applyPendingRouteInMemory(
  sp: StudentProfileRow | null,
  pendingRoute: QuniAccommodationVerificationRoute | null,
): { sp: StudentProfileRow | null; clearStorage: boolean } {
  if (!sp) return { sp, clearStorage: false }
  if (!pendingRoute) return { sp, clearStorage: false }

  if (sp.accommodation_verification_route != null) {
    return { sp, clearStorage: true }
  }

  return {
    sp: { ...sp, accommodation_verification_route: pendingRoute },
    clearStorage: true,
  }
}

async function ensureSignupProfileRowInMemory(
  user: User,
  sp: StudentProfileRow | null,
  lp: LandlordProfileRow | null,
): Promise<{ sp: StudentProfileRow | null; lp: LandlordProfileRow | null }> {
  if (sp || lp) return { sp, lp }

  const email = user.email?.trim() ?? ''
  const fullName = displayNameFromUser(user)
  const metaRole = user.user_metadata?.role

  if (metaRole === 'landlord') {
    const { data, error } = await supabase
      .from('landlord_profiles')
      .insert({
        user_id: user.id,
        email,
        full_name: fullName,
      })
      .select('*')
      .maybeSingle()
    if (!error && data) return { sp, lp: data as LandlordProfileRow }
    return { sp, lp }
  }

  if (isRenterRole(metaRole)) {
    const { data, error } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        email,
        full_name: fullName,
        accommodation_verification_route: accommodationRouteFromUser(user),
      })
      .select('*')
      .maybeSingle()
    if (!error && data) return { sp: data as StudentProfileRow, lp }
    return { sp, lp }
  }

  return { sp, lp }
}

async function persistRouteUpdateIfNeeded(
  userId: string,
  sp: StudentProfileRow | null,
  pendingRoute: QuniAccommodationVerificationRoute | null,
): Promise<StudentProfileRow | null> {
  const { sp: nextSp, clearStorage } = applyPendingRouteInMemory(sp, pendingRoute)
  if (!sp || !nextSp || nextSp === sp) {
    if (clearStorage) clearQuniAccommodationVerificationRoute()
    return sp
  }

  const { error } = await supabase
    .from('student_profiles')
    .update({ accommodation_verification_route: pendingRoute })
    .eq('user_id', userId)

  if (!error) clearQuniAccommodationVerificationRoute()
  return !error ? nextSp : sp
}

async function applyPendingSignupRoleInMemory(
  user: User,
  sp: StudentProfileRow | null,
  lp: LandlordProfileRow | null,
  urlRole: 'student' | 'renter' | 'landlord' | null,
  urlRoute: QuniAccommodationVerificationRoute | null,
): Promise<{ sp: StudentProfileRow | null; lp: LandlordProfileRow | null }> {
  const selected = getQuniSelectedRole() ?? urlRole ?? null
  if (!selected) return { sp, lp }
  if (!isRecentSignup(user.created_at)) {
    clearQuniSelectedRole()
    return { sp, lp }
  }

  if (!sp && !lp) {
    const metaRole = user.user_metadata?.role
    const writeRole = marketplaceRoleForWrite(selected)!
    if (marketplaceRoleForWrite(metaRole) !== writeRole) {
      const data: Record<string, string> = { role: writeRole }
      if (isRenterRole(selected)) {
        const metaRoute = user.user_metadata?.accommodation_verification_route
        const route =
          metaRoute === 'non_student' || metaRoute === 'student'
            ? metaRoute
            : urlRoute ?? getQuniAccommodationVerificationRoute()
        if (route) data.accommodation_verification_route = route
      }
      await supabase.auth.updateUser({ data })
    }
    return { sp, lp }
  }

  const fullName = sp?.full_name?.trim() || displayNameFromUser(user)
  const email = sp?.email?.trim() || user.email || ''

  if (selected === 'landlord' && sp && !lp) {
    const { error: delErr } = await supabase.from('student_profiles').delete().eq('user_id', user.id)
    if (delErr) return { sp, lp }

    const { data: insData, error: insErr } = await supabase
      .from('landlord_profiles')
      .insert({
        user_id: user.id,
        email,
        full_name: fullName,
      })
      .select('*')
      .maybeSingle()
    if (insErr) return { sp, lp }

    await supabase.auth.updateUser({ data: { role: 'landlord' } })
    clearQuniSelectedRole()
    clearQuniAccommodationVerificationRoute()
    return { sp: null, lp: (insData as LandlordProfileRow | null) ?? lp }
  }

  if (isRenterRole(selected) && lp && !sp) {
    const { error: delErr } = await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
    if (delErr) return { sp, lp }

    const route =
      user.user_metadata?.accommodation_verification_route === 'non_student' ||
      user.user_metadata?.accommodation_verification_route === 'student'
        ? user.user_metadata.accommodation_verification_route
        : urlRoute === 'student' || urlRoute === 'non_student'
          ? urlRoute
          : null
    const { data: insData, error: insErr } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        email: lp.email?.trim() || email,
        full_name: lp.full_name?.trim() || fullName,
        accommodation_verification_route:
          route === 'non_student' || route === 'student' ? route : null,
      })
      .select('*')
      .maybeSingle()
    if (insErr) return { sp, lp }

    await supabase.auth.updateUser({ data: { role: 'renter' } })
    clearQuniSelectedRole()
    return { sp: (insData as StudentProfileRow | null) ?? sp, lp: null }
  }

  return { sp, lp }
}

/**
 * Single read of profile rows, in-memory reconciliation, and conditional writes for auth callback.
 * Shares in-flight hydration with AuthContext via registerProfileHydrateInflight.
 */
export async function reconcileAuthCallbackProfile(
  user: User,
  options: AuthCallbackReconcileOptions,
): Promise<{ role: UserRole; profile: AuthProfile | null }> {
  const { afterSignupEmailConfirm, urlRoute, urlRole } = options

  const meta = user.user_metadata?.role
  const metaIsKnownRole = isRenterRole(meta) || meta === 'landlord'
  const mayBePlatformAdmin = meta === 'admin' || !metaIsKnownRole
  if (mayBePlatformAdmin && (meta === 'admin' || (await fetchIsPlatformAdmin()))) {
    await linkPlatformStaffUserIfNeeded(user)
    return { role: 'admin', profile: null }
  }

  let { sp, lp } = await fetchProfileRowsDeduped(user.id)

  if (afterSignupEmailConfirm) {
    ;({ sp, lp } = await ensureSignupProfileRowInMemory(user, sp, lp))
  }

  const pendingRoute = resolvePendingAccommodationVerificationRoute(
    user.created_at,
    user.user_metadata?.accommodation_verification_route,
    urlRoute,
  )
  sp = await persistRouteUpdateIfNeeded(user.id, sp, pendingRoute)

  if (!shouldSkipApplyPendingSignupRole(user.user_metadata?.role, sp)) {
    ;({ sp, lp } = await applyPendingSignupRoleInMemory(user, sp, lp, urlRole, urlRoute))
  }

  return resolveRoleAndProfileFromRows(user, sp, lp)
}

/** Register reconcile so concurrent AuthContext hydration awaits the same result. */
export function reconcileAuthCallbackProfileDeduped(
  user: User,
  options: AuthCallbackReconcileOptions,
): Promise<{ role: UserRole; profile: AuthProfile | null }> {
  const existing = getProfileHydrateInflight(user.id)
  if (existing) return existing

  const inflight = reconcileAuthCallbackProfile(user, options)
  setProfileHydrateInflight(user.id, inflight)
  return inflight
}
