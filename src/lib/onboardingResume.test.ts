import { describe, expect, it } from 'vitest'
import { isOnboardingResumeExempt } from './onboardingResume'

describe('isOnboardingResumeExempt', () => {
  it('exempts onboarding and auth entry paths', () => {
    expect(isOnboardingResumeExempt('/onboarding')).toBe(true)
    expect(isOnboardingResumeExempt('/onboarding/student')).toBe(true)
    expect(isOnboardingResumeExempt('/auth/callback')).toBe(true)
    expect(isOnboardingResumeExempt('/verify-email')).toBe(true)
    expect(isOnboardingResumeExempt('/login')).toBe(true)
    expect(isOnboardingResumeExempt('/signup')).toBe(true)
    expect(isOnboardingResumeExempt('/admin')).toBe(true)
    expect(isOnboardingResumeExempt('/admin/students')).toBe(true)
  })

  it('does not exempt public home or listings', () => {
    expect(isOnboardingResumeExempt('/')).toBe(false)
    expect(isOnboardingResumeExempt('/listings')).toBe(false)
    expect(isOnboardingResumeExempt('/student-dashboard')).toBe(false)
  })
})
