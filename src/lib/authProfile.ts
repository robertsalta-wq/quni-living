import type { User } from '@supabase/supabase-js'
import { isAdminUser } from './adminEmails'
import { supabase } from './supabase'
import type { Database } from './database.types'

export type UserRole = 'student' | 'landlord' | 'admin' | null

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
export type AuthProfile = StudentProfileRow | LandlordProfileRow

/**
 * Role resolution:
 * 1. If metadata role has a matching profile row, trust that pair.
 * 2. If metadata is stale/mismatched, trust whichever profile row exists.
 * 3. If neither profile exists, fall back to metadata role (onboarding can create row).
 */
export async function fetchRoleAndProfile(user: User): Promise<{
  role: UserRole
  profile: AuthProfile | null
}> {
  if (isAdminUser(user)) {
    return { role: 'admin', profile: null }
  }

  const [{ data: spRaw }, { data: lpRaw }] = await Promise.all([
    supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('landlord_profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const sp = spRaw as StudentProfileRow | null
  const lp = lpRaw as LandlordProfileRow | null

  const meta = user.user_metadata?.role
  if (meta === 'student' || meta === 'landlord') {
    if (meta === 'student' && sp) return { role: 'student', profile: sp }
    if (meta === 'landlord' && lp) return { role: 'landlord', profile: lp }
  }
  if (sp) return { role: 'student', profile: sp }
  if (lp) return { role: 'landlord', profile: lp }
  if (meta === 'student' || meta === 'landlord') return { role: meta, profile: null }
  return { role: null, profile: null }
}

/**
 * Default destination after login when no explicit `?redirect=` is used.
 * Student: incomplete onboarding → /onboarding/student; complete → /listings.
 * Landlord → /onboarding/landlord until wizard complete, then /landlord/dashboard. Admin → /admin. No role → /onboarding.
 */
export function getPostLoginRedirectDestination(
  user: User,
  role: UserRole,
  profile: AuthProfile | null,
): string {
  if (role === 'admin' || isAdminUser(user)) return '/admin'
  if (role === 'landlord') {
    const lp = profile as LandlordProfileRow | null
    if (lp && lp.onboarding_complete !== true) return '/onboarding/landlord'
    return '/landlord/dashboard'
  }
  if (role === 'student') {
    const sp = profile as StudentProfileRow | null
    if (!sp || sp.onboarding_complete !== true) return '/onboarding/student'
    return '/listings'
  }
  return '/onboarding'
}

/** Legacy helper — prefer `getPostLoginRedirectDestination` when user + profile are available. */
export function getDashboardPath(role: UserRole): string {
  if (role === 'student') return '/listings'
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'admin') return '/admin'
  return '/onboarding'
}

/** True if user must still complete onboarding (role selection, profile row, or student onboarding). */
export function needsOnboarding(role: UserRole, profile: AuthProfile | null): boolean {
  if (role === 'admin') return false
  if (!role) return true
  if (profile === null) return true
  if (role === 'student') {
    return (profile as StudentProfileRow).onboarding_complete !== true
  }
  return false
}
