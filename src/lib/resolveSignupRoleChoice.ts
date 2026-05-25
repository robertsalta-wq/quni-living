import type { User } from '@supabase/supabase-js'
import { fetchRoleAndProfile, type UserRole } from './authProfile'
import { getQuniSelectedRole } from './quniSelectedRole'

export type SignupRoleChoice = 'student' | 'landlord'

/**
 * Prefer server-side profile + metadata over localStorage for post-signup routing.
 */
export async function resolveSignupRoleChoice(user: User): Promise<{
  role: SignupRoleChoice
  usedLocalStorageFallback: boolean
}> {
  const { role: resolved } = await fetchRoleAndProfile(user)
  if (resolved === 'landlord') {
    return { role: 'landlord', usedLocalStorageFallback: false }
  }
  if (resolved === 'student') {
    return { role: 'student', usedLocalStorageFallback: false }
  }

  const stored = getQuniSelectedRole()
  if (stored === 'landlord') {
    return { role: 'landlord', usedLocalStorageFallback: true }
  }
  return { role: 'student', usedLocalStorageFallback: stored === null }
}

export function signupRoleChoiceFromUserRole(role: UserRole): SignupRoleChoice | null {
  if (role === 'landlord') return 'landlord'
  if (role === 'student') return 'student'
  return null
}
