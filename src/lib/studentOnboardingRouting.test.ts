import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renterOnboardingIncomplete } from './studentOnboarding'
import type { StudentProfileRow } from './studentOnboarding'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  })
  return store
}

function baseProfile(overrides: Partial<StudentProfileRow> = {}): StudentProfileRow {
  return {
    renter_situation: 'student',
    accommodation_verification_route: 'student',
    uni_email_verified: true,
    uni_email: 'alex@uni.edu.au',
    first_name: 'Alex',
    last_name: 'Smith',
    university_id: '00000000-0000-0000-0000-000000000001',
    course: 'BSc',
    study_level: 'year_1',
    gender: 'female',
    phone: '0412345678',
    budget_min_per_week: 300,
    budget_max_per_week: 400,
    emergency_contact_name: 'Pat Smith',
    emergency_contact_phone: '0498765432',
    terms_accepted_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as StudentProfileRow
}

describe('renterOnboardingIncomplete', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is incomplete when profile is missing', () => {
    expect(renterOnboardingIncomplete(null, 'user-1')).toBe(true)
  })

  it('is incomplete when route is unset', () => {
    expect(renterOnboardingIncomplete(baseProfile({ accommodation_verification_route: null, renter_situation: null }), 'user-1')).toBe(
      true,
    )
  })

  it('is incomplete when situation is unset even if legacy route remains', () => {
    expect(
      renterOnboardingIncomplete(
        baseProfile({ renter_situation: null, accommodation_verification_route: 'non_student' }),
        'user-1',
      ),
    ).toBe(true)
  })

  it('is incomplete when student route lacks uni email verification', () => {
    expect(
      renterOnboardingIncomplete(
        baseProfile({ uni_email_verified: false, terms_accepted_at: null }),
        'user-1',
      ),
    ).toBe(true)
  })

  it('is incomplete when step 1 fields are missing', () => {
    expect(renterOnboardingIncomplete(baseProfile({ phone: null, terms_accepted_at: null }), 'user-1')).toBe(
      true,
    )
  })

  it('is incomplete when step 2 emergency contact is missing', () => {
    expect(
      renterOnboardingIncomplete(
        baseProfile({ emergency_contact_name: null, terms_accepted_at: null }),
        'user-1',
      ),
    ).toBe(true)
  })

  it('is incomplete when terms are not accepted', () => {
    expect(renterOnboardingIncomplete(baseProfile({ terms_accepted_at: null }), 'user-1')).toBe(true)
  })

  it('is complete when all wizard gates pass (ignores onboarding_complete boolean)', () => {
    expect(
      renterOnboardingIncomplete(baseProfile({ onboarding_complete: false }), 'user-1'),
    ).toBe(false)
    expect(
      renterOnboardingIncomplete(baseProfile({ onboarding_complete: true, terms_accepted_at: null }), 'user-1'),
    ).toBe(true)
  })

  it('uses identity-path step 1 for non-student route', () => {
    const p = baseProfile({
      renter_situation: 'working',
      accommodation_verification_route: 'non_student',
      university_id: null,
      course: null,
      study_level: null,
      uni_email_verified: false,
    })
    expect(renterOnboardingIncomplete(p, 'user-1')).toBe(false)
  })
})
