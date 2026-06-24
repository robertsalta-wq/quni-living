import { describe, expect, it } from 'vitest'
import {
  computeRenterReadiness,
  computeVerificationTierEligible,
  effectiveVerificationTier,
  tierToPromote,
  tierToSync,
} from './renterReadiness'
import type { StudentProfileRow } from './studentOnboarding'
import { isStudentListingActionsUnlocked } from './onboardingChecklist'

function lucyProfile(overrides: Partial<StudentProfileRow> = {}): StudentProfileRow {
  return {
    renter_situation: 'student',
    accommodation_verification_route: 'student',
    verification_type: 'none',
    onboarding_complete: true,
    terms_accepted_at: '2026-01-01T00:00:00Z',
    first_name: 'Lucy',
    last_name: 'Example',
    university_id: '00000000-0000-0000-0000-000000000001',
    course: 'BSc',
    study_level: 'year_2',
    gender: 'female',
    phone: '0412345678',
    budget_min_per_week: 300,
    budget_max_per_week: 400,
    emergency_contact_name: 'Pat Example',
    emergency_contact_phone: '0498765432',
    uni_email_verified: true,
    uni_email: 'lucy@uni.edu.au',
    ...overrides,
  } as StudentProfileRow
}

describe('Lucy scenario (onboarding_complete without verification)', () => {
  it('blocks booking until verification tier is satisfied', () => {
    const p = lucyProfile()
    const readiness = computeRenterReadiness(p)

    expect(readiness.profileSetupComplete).toBe(true)
    expect(readiness.effectiveVerificationTier).toBe('none')
    expect(readiness.canRequestBooking).toBe(false)
    expect(readiness.blocksBooking).toContain('Complete student verification (ID and enrolment)')
    expect(isStudentListingActionsUnlocked(p)).toBe(false)
  })

  it('unlocks booking when verification docs promote tier', () => {
    const p = lucyProfile({
      id_document_url: 'student-id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      enrolment_doc_url: 'student-enrol/user/doc.pdf',
      enrolment_submitted_at: '2026-01-02T00:00:00Z',
      verification_type: 'student',
    })
    const readiness = computeRenterReadiness(p)

    expect(computeVerificationTierEligible(p)).toBe('student')
    expect(effectiveVerificationTier(p)).toBe('student')
    expect(readiness.canRequestBooking).toBe(true)
    expect(isStudentListingActionsUnlocked(p)).toBe(true)
  })
})

describe('tierToPromote', () => {
  it('returns student when eligible and column is none', () => {
    const p = lucyProfile({
      id_document_url: 'student-id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      enrolment_doc_url: 'student-enrol/user/doc.pdf',
      enrolment_submitted_at: '2026-01-02T00:00:00Z',
    })
    expect(tierToPromote(p)).toBe('student')
  })

  it('returns null when already promoted', () => {
    expect(tierToPromote(lucyProfile({ verification_type: 'student' }))).toBe(null)
  })
})

describe('tierToSync', () => {
  it('promotes when eligible and column is none', () => {
    const p = lucyProfile({
      id_document_url: 'student-id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      enrolment_doc_url: 'student-enrol/user/doc.pdf',
      enrolment_submitted_at: '2026-01-02T00:00:00Z',
    })
    expect(tierToSync(p)).toBe('student')
  })

  it('returns null when stored tier matches eligibility', () => {
    const p = lucyProfile({
      verification_type: 'student',
      id_document_url: 'student-id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      enrolment_doc_url: 'student-enrol/user/doc.pdf',
      enrolment_submitted_at: '2026-01-02T00:00:00Z',
    })
    expect(tierToSync(p)).toBe(null)
  })

  it('demotes student to none when ID doc is cleared on replace', () => {
    const p = lucyProfile({
      verification_type: 'student',
      id_document_url: null,
      id_submitted_at: null,
      enrolment_doc_url: 'student-enrol/user/doc.pdf',
      enrolment_submitted_at: '2026-01-02T00:00:00Z',
    })
    expect(computeVerificationTierEligible(p)).toBe('none')
    expect(tierToSync(p)).toBe('none')
  })

  it('demotes identity to none when supporting doc is cleared on replace', () => {
    const p = {
      renter_situation: 'working',
      accommodation_verification_route: 'non_student',
      verification_type: 'identity',
      terms_accepted_at: '2026-01-01T00:00:00Z',
      first_name: 'Casey',
      last_name: 'Doe',
      gender: 'female',
      phone: '0412345678',
      emergency_contact_name: 'Pat Doe',
      emergency_contact_phone: '0498765432',
      id_document_url: 'id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      identity_supporting_doc_url: null,
      identity_supporting_submitted_at: null,
    } as StudentProfileRow
    expect(tierToSync(p)).toBe('none')
  })
})

describe('non-student route readiness', () => {
  function nonStudentBase(overrides: Partial<StudentProfileRow> = {}): StudentProfileRow {
    return {
      renter_situation: 'working',
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

  it('blocks booking without identity docs', () => {
    const p = nonStudentBase()
    expect(computeRenterReadiness(p).canRequestBooking).toBe(false)
    expect(isStudentListingActionsUnlocked(p)).toBe(false)
  })

  it('unlocks when identity tier is complete', () => {
    const p = nonStudentBase({
      verification_type: 'identity',
      id_document_url: 'id/user/doc.pdf',
      id_submitted_at: '2026-01-02T00:00:00Z',
      identity_supporting_doc_url: 'support/user/doc.pdf',
      identity_supporting_submitted_at: '2026-01-02T00:00:00Z',
    })
    expect(computeRenterReadiness(p).canRequestBooking).toBe(true)
    expect(tierToPromote(p)).toBe(null)
  })

  it('blocks legacy non_student rows until situation is chosen', () => {
    const legacy = nonStudentBase({
      renter_situation: null,
      accommodation_verification_route: 'non_student',
    })
    const readiness = computeRenterReadiness(legacy)
    expect(readiness.sections.situationRoute).toBe(false)
    expect(readiness.blocksBooking).toContain('Choose your situation')
    expect(readiness.canRequestBooking).toBe(false)
  })
})
