import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { isRenterRole } from './authProfile'

/** Unit-test role gating without hitting Supabase. */
export function shouldBootstrapSignupProfile(user: Pick<User, 'user_metadata'>): boolean {
  const role = user.user_metadata?.role
  return isRenterRole(role) || role === 'landlord'
}

describe('shouldBootstrapSignupProfile', () => {
  it('allows student and landlord metadata', () => {
    expect(shouldBootstrapSignupProfile({ user_metadata: { role: 'student' } })).toBe(true)
    expect(shouldBootstrapSignupProfile({ user_metadata: { role: 'renter' } })).toBe(true)
    expect(shouldBootstrapSignupProfile({ user_metadata: { role: 'landlord' } })).toBe(true)
  })

  it('skips missing or ambiguous roles', () => {
    expect(shouldBootstrapSignupProfile({ user_metadata: {} })).toBe(false)
    expect(shouldBootstrapSignupProfile({ user_metadata: { role: 'admin' } })).toBe(false)
  })
})
