import type { User } from '@supabase/supabase-js'
import { isRenterRole } from './authProfile'
import { marketplaceRoleForWrite } from './marketplaceRole'
import { supabase } from './supabase'
import { applyPendingAccommodationRouteToStudentProfile } from './applyPendingAccommodationRoute'
import { clearQuniAccommodationVerificationRoute } from './quniAccommodationRoute'
import { clearQuniSelectedRole, getQuniSelectedRole } from './quniSelectedRole'
import { mergeSignupTermsIntoInsert } from './applyPendingSignupTerms'
import { consumeSignupTermsAcceptedAt } from './quniSignupTerms'

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
  urlRole?: 'renter' | 'landlord' | null,
  _urlRoute?: 'student' | 'non_student' | null,
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
    await applyPendingAccommodationRouteToStudentProfile(user.id, user.created_at)
  }

  if (!sp && !lp) {
    const metaRole = user.user_metadata?.role
    const writeRole = marketplaceRoleForWrite(selected)!
    if (marketplaceRoleForWrite(metaRole) !== writeRole) {
      await supabase.auth.updateUser({ data: { role: writeRole } })
    }
    return
  }

  const fullName = sp?.full_name?.trim() || displayNameFromUser(user)
  const email = sp?.email?.trim() || user.email || ''

  if (selected === 'landlord' && sp && !lp) {
    const { error: delErr } = await supabase.from('student_profiles').delete().eq('user_id', user.id)
    if (delErr) return

    const insertRow = mergeSignupTermsIntoInsert('landlord', {
      user_id: user.id,
      email,
      full_name: fullName,
    })
    const { error: insErr } = await supabase.from('landlord_profiles').insert(insertRow)
    if (insErr) return
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()

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

    const insertRow = mergeSignupTermsIntoInsert('renter', {
      user_id: user.id,
      email: lpRow?.email?.trim() || email,
      full_name: lpRow?.full_name?.trim() || fullName,
    })
    const { error: insErr } = await supabase.from('student_profiles').insert(insertRow)
    if (insErr) return
    if (insertRow.terms_accepted_at) consumeSignupTermsAcceptedAt()

    await supabase.auth.updateUser({ data: { role: 'renter' } })
    clearQuniSelectedRole()
  }
}
