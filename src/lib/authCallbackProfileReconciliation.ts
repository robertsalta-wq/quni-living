import type { User } from '@supabase/supabase-js'
import { resolvePendingAccommodationVerificationRoute } from './applyPendingAccommodationRoute'
import {
  fetchProfileRowsDeduped,
  deleteProfileHydrateInflight,
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
  type QuniAccommodationVerificationRoute,
} from './quniAccommodationRoute'
import { clearQuniSelectedRole, getQuniSelectedRole } from './quniSelectedRole'
import { applyPendingSignupTerms, mergeSignupTermsIntoInsert } from './applyPendingSignupTerms'
import { consumeSignupTermsAcceptedAt } from './quniSignupTerms'
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

export type AuthCallbackReconcileOptions = {
  afterSignupEmailConfirm: boolean
  urlRoute: QuniAccommodationVerificationRoute | null
  urlRole: 'renter' | 'landlord' | null
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
    const insertRow = mergeSignupTermsIntoInsert('landlord', {
      user_id: user.id,
      email,
      full_name: fullName,
    })
    const { data, error } = await supabase
      .from('landlord_profiles')
      .insert(insertRow)
      .select('*')
      .maybeSingle()
    if (!error && data) {
      if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()
      return { sp, lp: data as LandlordProfileRow }
    }
    return { sp, lp }
  }

  if (isRenterRole(metaRole)) {
    const insertRow = mergeSignupTermsIntoInsert('renter', {
      user_id: user.id,
      email,
      full_name: fullName,
      preferred_name: fullName,
    })
    const { data, error } = await supabase
      .from('student_profiles')
      .insert(insertRow)
      .select('*')
      .maybeSingle()
    if (!error && data) {
      if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()
      return { sp: data as StudentProfileRow, lp }
    }
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
  urlRole: 'renter' | 'landlord' | null,
  _urlRoute: QuniAccommodationVerificationRoute | null,
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
        /* Route deferred to profile section 0 — do not write accommodation_verification_route at signup. */
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

    const insertRow = mergeSignupTermsIntoInsert('landlord', {
      user_id: user.id,
      email,
      full_name: fullName,
    })
    const { data: insData, error: insErr } = await supabase
      .from('landlord_profiles')
      .insert(insertRow)
      .select('*')
      .maybeSingle()
    if (insErr) return { sp, lp }
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()

    await supabase.auth.updateUser({ data: { role: 'landlord' } })
    clearQuniSelectedRole()
    clearQuniAccommodationVerificationRoute()
    return { sp: null, lp: (insData as LandlordProfileRow | null) ?? lp }
  }

  if (isRenterRole(selected) && lp && !sp) {
    const { error: delErr } = await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
    if (delErr) return { sp, lp }

    const socialName = lp.full_name?.trim() || fullName
    const insertRow = mergeSignupTermsIntoInsert('renter', {
      user_id: user.id,
      email: lp.email?.trim() || email,
      full_name: socialName,
      preferred_name: socialName,
    })
    const { data: insData, error: insErr } = await supabase
      .from('student_profiles')
      .insert(insertRow)
      .select('*')
      .maybeSingle()
    if (insErr) return { sp, lp }
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()

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
  // Never trust user_metadata for admin — verify against platform_staff via RPC.
  if (!metaIsKnownRole && (await fetchIsPlatformAdmin())) {
    await linkPlatformStaffUserIfNeeded(user)
    return { role: 'admin', profile: null }
  }

  let { sp, lp } = await fetchProfileRowsDeduped(user.id)

  if (afterSignupEmailConfirm) {
    ;({ sp, lp } = await ensureSignupProfileRowInMemory(user, sp, lp))
  }

  if (sp) {
    const pendingRoute = resolvePendingAccommodationVerificationRoute(
      user.created_at,
      user.user_metadata?.accommodation_verification_route,
      urlRoute,
    )
    sp = await persistRouteUpdateIfNeeded(user.id, sp, pendingRoute)
  }

  const skipRoleFlip =
    afterSignupEmailConfirm && meta === 'landlord' && lp != null && !sp
  if (!shouldSkipApplyPendingSignupRole(user.user_metadata?.role, sp) && !skipRoleFlip) {
    ;({ sp, lp } = await applyPendingSignupRoleInMemory(user, sp, lp, urlRole, urlRoute))
  }

  if (sp && !sp.terms_accepted_at) {
    await applyPendingSignupTerms(user.id, 'renter')
    const { data: refreshedSp } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (refreshedSp) sp = refreshedSp as StudentProfileRow
  } else if (lp && !lp.terms_accepted_at) {
    await applyPendingSignupTerms(user.id, 'landlord')
    const { data: refreshedLp } = await supabase
      .from('landlord_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (refreshedLp) lp = refreshedLp as LandlordProfileRow
  }

  return resolveRoleAndProfileFromRows(user, sp, lp)
}

/** Register reconcile so concurrent AuthContext hydration awaits the same result. */
export function reconcileAuthCallbackProfileDeduped(
  user: User,
  options: AuthCallbackReconcileOptions,
): Promise<{ role: UserRole; profile: AuthProfile | null }> {
  deleteProfileHydrateInflight(user.id)
  const inflight = reconcileAuthCallbackProfile(user, options)
  setProfileHydrateInflight(user.id, inflight)
  return inflight
}
