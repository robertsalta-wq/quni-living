import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database } from './database.types'

export type UserRole = 'student' | 'landlord' | null

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
export type AuthProfile = StudentProfileRow | LandlordProfileRow

/**
 * Role resolution (spec order):
 * 1. user_metadata.role
 * 2. student_profiles row
 * 3. landlord_profiles row
 */
export async function fetchRoleAndProfile(user: User): Promise<{
  role: UserRole
  profile: AuthProfile | null
}> {
  const [{ data: spRaw }, { data: lpRaw }] = await Promise.all([
    supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('landlord_profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const sp = spRaw as StudentProfileRow | null
  const lp = lpRaw as LandlordProfileRow | null

  const meta = user.user_metadata?.role
  if (meta === 'student' || meta === 'landlord') {
    const profile: AuthProfile | null = meta === 'student' ? sp : lp
    return { role: meta, profile }
  }
  if (sp) return { role: 'student', profile: sp }
  if (lp) return { role: 'landlord', profile: lp }
  return { role: null, profile: null }
}

export function getDashboardPath(role: UserRole): string {
  if (role === 'student') return '/student-dashboard'
  if (role === 'landlord') return '/landlord-dashboard'
  return '/'
}

/** True if user needs to complete onboarding (no profile row for resolved flow) */
export function needsOnboarding(role: UserRole, profile: AuthProfile | null): boolean {
  if (!role) return true
  return profile === null
}
