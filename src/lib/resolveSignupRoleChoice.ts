import type { User } from '@supabase/supabase-js'
import { fetchRoleAndProfile, isRenterRole, type UserRole } from './authProfile'
import { getQuniSelectedRole } from './quniSelectedRole'

export type SignupRoleChoice = 'renter' | 'landlord'

/**
 * Prefer server-side profile + metadata over localStorage for post-signup routing.
 */
export async function resolveSignupRoleChoice(user: User): Promise<{
  role: SignupRoleChoice
  /** True only when neither server nor localStorage had a role - we default to renter. */
  missingRoleChoice: boolean
}> {
  const { role: resolved } = await fetchRoleAndProfile(user)
  if (resolved === 'landlord') {
    return { role: 'landlord', missingRoleChoice: false }
  }
  if (isRenterRole(resolved)) {
    return { role: 'renter', missingRoleChoice: false }
  }

  const stored = getQuniSelectedRole()
  if (stored === 'landlord') {
    return { role: 'landlord', missingRoleChoice: false }
  }
  if (isRenterRole(stored)) {
    return { role: 'renter', missingRoleChoice: false }
  }
  return { role: 'renter', missingRoleChoice: true }
}

export function signupRoleChoiceFromUserRole(role: UserRole): SignupRoleChoice | null {
  if (role === 'landlord') return 'landlord'
  if (isRenterRole(role)) return 'renter'
  return null
}
