import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
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
export async function applyPendingSignupRole(user: User): Promise<void> {
  const selected = getQuniSelectedRole()
  if (!selected) return
  if (!isRecentSignup(user.created_at)) {
    clearQuniSelectedRole()
    return
  }

  const [{ data: sp }, { data: lp }] = await Promise.all([
    supabase.from('student_profiles').select('user_id, full_name, email').eq('user_id', user.id).maybeSingle(),
    supabase.from('landlord_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])

  // Google OAuth cannot attach signup role on first redirect — persist it once the session exists.
  if (!sp && !lp) {
    const metaRole = user.user_metadata?.role
    if (metaRole !== selected) {
      const data: Record<string, string> = { role: selected }
      if (selected === 'student') {
        const metaRoute = user.user_metadata?.accommodation_verification_route
        const route =
          metaRoute === 'non_student' || metaRoute === 'student'
            ? metaRoute
            : getQuniAccommodationVerificationRoute()
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

  if (selected === 'student' && lp && !sp) {
    const { data: lpRow } = await supabase
      .from('landlord_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .maybeSingle()
    const { error: delErr } = await supabase.from('landlord_profiles').delete().eq('user_id', user.id)
    if (delErr) return

    const route = user.user_metadata?.accommodation_verification_route
    const { error: insErr } = await supabase.from('student_profiles').insert({
      user_id: user.id,
      email: lpRow?.email?.trim() || email,
      full_name: lpRow?.full_name?.trim() || fullName,
      accommodation_verification_route:
        route === 'non_student' || route === 'student' ? route : null,
    })
    if (insErr) return

    await supabase.auth.updateUser({ data: { role: 'student' } })
    clearQuniSelectedRole()
  }
}
