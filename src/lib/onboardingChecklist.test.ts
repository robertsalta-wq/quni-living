import { describe, expect, it } from 'vitest'
import {
  buildStudentOnboardingSteps,
  isStudentListingActionsUnlocked,
} from './onboardingChecklist'
import type { StudentProfileRow } from './onboardingChecklist'
import { isTenantCoreProfileComplete } from './studentOnboarding'

function baseProfile(overrides: Partial<StudentProfileRow> = {}): StudentProfileRow {
  return {
    accommodation_verification_route: 'non_student',
    verification_type: 'none',
    terms_accepted_at: '2026-01-01T00:00:00Z',
    first_name: 'Casey',
    last_name: 'Doe',
    gender: 'female',
    phone: '0412345678',
    budget_min_per_week: 300,
    budget_max_per_week: 400,
    emergency_contact_name: 'Pat Doe',
    emergency_contact_phone: '0498765432',
    university_id: null,
    course: null,
    ...overrides,
  } as StudentProfileRow
}

describe('non-student tenant onboarding', () => {
  it('keeps listing actions locked until identity verification', () => {
    const p = baseProfile()
    expect(isTenantCoreProfileComplete(p)).toBe(true)
    expect(isStudentListingActionsUnlocked(p)).toBe(false)
  })

  it('checklist includes identity verification, not uni email', () => {
    const steps = buildStudentOnboardingSteps(baseProfile())
    const ids = steps.map((s) => s.id)
    expect(ids).toContain('identity_verify')
    expect(ids).not.toContain('uni_email')
    const identityStep = steps.find((s) => s.id === 'identity_verify')
    expect(identityStep?.complete).toBe(false)
    expect(identityStep?.href).toBe('/student-profile?tab=verification')
  })

  it('marks identity step complete when verification_type is identity', () => {
    const steps = buildStudentOnboardingSteps(
      baseProfile({ verification_type: 'identity' }),
    )
    expect(steps.find((s) => s.id === 'identity_verify')?.complete).toBe(true)
    expect(isStudentListingActionsUnlocked(baseProfile({ verification_type: 'identity' }))).toBe(true)
  })
})
