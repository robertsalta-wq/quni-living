import type { User } from '@supabase/supabase-js'
import { isRenterRole } from './authProfile'
import { marketplaceRoleForWrite } from './marketplaceRole'
import { supabase } from './supabase'
import {
  applyPendingAccommodationRouteToStudentProfile,
} from './applyPendingAccommodationRoute'
import { clearQuniAccommodationVerificationRoute, getQuniAccommodationVerificationRoute } from './quniAccommodationRoute'
import { clearQuniSelectedRole, getQuniSelectedRole } from './quniSelectedRole'

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

/**
 * Google OAuth cannot always persist signup role on first redirect. After session is established,
 * reconcile localStorage role choice with profile rows for accounts created in the last 30 minutes.
 */
export async function applyPendingSignupRole(
  user: User,
  urlRole?: 'student' | 'renter' | 'landlord' | null,
  urlRoute?: 'student' | 'non_student' | null,
): Promise<void> {
  const selected = getQuniSelectedRole() ?? urlRole ?? null
  if (!selected) return
  if (!isRecentSignup(user.created_at)) {
    clearQuniSelectedRole()
    return
  }

  const [{ data: sp }, { data: lp }] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('user_id, full_name, email, accommodation_verification_route')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('landlord_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])

  if (isRenterRole(selected) && sp?.accommodation_verification_route == null) {
    await applyPendingAccommodationRouteToStudentProfile(
      user.id,
      user.created_at,
      user.user_metadata?.accommodation_verification_route,
      urlRoute,
    )
  }

  // Google OAuth cannot attach signup role on first redirect - persist it once the session exists.
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
    return
  }

  const fullName = sp?.full_name?.trim() || displayNameFromUser(user)
  const email = sp?.email?.trim() || user.email || ''

  if (selected === 'landlord' && sp && !lp) {
    const { error: delErr } = await supabase.from('student_profiles').delete().eq('user_id', user.id)
    if (delErr) return

    const { error: insErr } = await supabase.from('landlord_profiles').insert({
      user_id: user.id,
      email,
      full_name: fullName,
    })
    if (insErr) return

    await supabase.auth.updateUser({ data: { role: 'landlord' } })
    clearQuniSelectedRole()
    clearQuniAccommodationVerificationRoute()
    return
  }

  if (isRenterRole(selected) && lp && !sp) {
    const { data: lpRow } = await supabase
      .from('landlord_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .maybeSingle()
    const { error: delErr } = await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
    if (delErr) return

    const route =
      user.user_metadata?.accommodation_verification_route === 'non_student' ||
      user.user_metadata?.accommodation_verification_route === 'student'
        ? user.user_metadata.accommodation_verification_route
        : urlRoute === 'student' || urlRoute === 'non_student'
          ? urlRoute
          : null
    const { error: insErr } = await supabase.from('student_profiles').insert({
      user_id: user.id,
      email: lpRow?.email?.trim() || email,
      full_name: lpRow?.full_name?.trim() || fullName,
      accommodation_verification_route:
        route === 'non_student' || route === 'student' ? route : null,
    })
    if (insErr) return

    await supabase.auth.updateUser({ data: { role: 'renter' } })
    clearQuniSelectedRole()
  }
}
