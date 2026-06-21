import { describe, expect, it } from 'vitest'
import { isPostAuthOnboardingGuardExempt } from './PostAuthOnboardingGuard'

describe('isPostAuthOnboardingGuardExempt', () => {
  it('exempts onboarding and auth entry paths', () => {
    expect(isPostAuthOnboardingGuardExempt('/onboarding')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/onboarding/student')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/auth/callback')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/verify-email')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/login')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/signup')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/admin')).toBe(true)
    expect(isPostAuthOnboardingGuardExempt('/admin/students')).toBe(true)
  })

  it('does not exempt public home or listings', () => {
    expect(isPostAuthOnboardingGuardExempt('/')).toBe(false)
    expect(isPostAuthOnboardingGuardExempt('/listings')).toBe(false)
    expect(isPostAuthOnboardingGuardExempt('/student-dashboard')).toBe(false)
  })
})
