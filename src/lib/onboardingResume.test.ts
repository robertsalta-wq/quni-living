import { describe, expect, it } from 'vitest'
import { isOnboardingResumeDashboardPath, isOnboardingResumeExempt } from './onboardingResume'

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

describe('isOnboardingResumeDashboardPath', () => {
  it('hides global resume on dashboards that own a profile nudge', () => {
    expect(isOnboardingResumeDashboardPath('/student-dashboard')).toBe(true)
    expect(isOnboardingResumeDashboardPath('/landlord/dashboard')).toBe(true)
    expect(isOnboardingResumeDashboardPath('/landlord/dashboard/foo')).toBe(true)
    expect(isOnboardingResumeDashboardPath('/student-profile')).toBe(true)
  })

  it('keeps resume on marketing and browse surfaces', () => {
    expect(isOnboardingResumeDashboardPath('/')).toBe(false)
    expect(isOnboardingResumeDashboardPath('/listings')).toBe(false)
  })
})
