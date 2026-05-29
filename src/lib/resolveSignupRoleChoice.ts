import type { User } from '@supabase/supabase-js'
import { fetchRoleAndProfile, type UserRole } from './authProfile'
import { getQuniSelectedRole } from './quniSelectedRole'

export type SignupRoleChoice = 'student' | 'landlord'

/**
 * Prefer server-side profile + metadata over localStorage for post-signup routing.
 */
export async function resolveSignupRoleChoice(user: User): Promise<{
  role: SignupRoleChoice
  /** True only when neither server nor localStorage had a role — we default to student. */
  missingRoleChoice: boolean
}> {
  const { role: resolved } = await fetchRoleAndProfile(user)
  if (resolved === 'landlord') {
    return { role: 'landlord', missingRoleChoice: false }
  }
  if (resolved === 'student') {
    return { role: 'student', missingRoleChoice: false }
  }

  const stored = getQuniSelectedRole()
  if (stored === 'landlord') {
    return { role: 'landlord', missingRoleChoice: false }
  }
  if (stored === 'student') {
    return { role: 'student', missingRoleChoice: false }
  }
  return { role: 'student', missingRoleChoice: true }
}

export function signupRoleChoiceFromUserRole(role: UserRole): SignupRoleChoice | null {
  if (role === 'landlord') return 'landlord'
  if (role === 'student') return 'student'
  return null
}
