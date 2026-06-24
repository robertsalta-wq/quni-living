import { describe, expect, it } from 'vitest'
import {
  isGeneralRouteSectionComplete,
  isRouteSectionComplete,
  isStudentRouteSectionComplete,
  isVisaRouteSectionComplete,
  isWorkingRouteSectionComplete,
  routeSectionClearPatch,
  routeSectionHasData,
} from './renterRouteSection'
import type { StudentProfileRow } from './studentOnboarding'

function baseProfile(overrides: Partial<StudentProfileRow> = {}): StudentProfileRow {
  return {
    user_id: '00000000-0000-0000-0000-000000000001',
    ...overrides,
  } as StudentProfileRow
}

describe('routeSectionHasData', () => {
  it('detects student route fields', () => {
    expect(routeSectionHasData('student', baseProfile())).toBe(false)
    expect(
      routeSectionHasData(
        'student',
        baseProfile({ university_id: '00000000-0000-0000-0000-000000000002' }),
      ),
    ).toBe(true)
    expect(routeSectionHasData('student', baseProfile({ course: 'BSc' }))).toBe(true)
    expect(
      routeSectionHasData(
        'student',
        baseProfile({
          enrolment_doc_url: 'enrol/x.pdf',
          enrolment_submitted_at: '2026-01-01T00:00:00Z',
        }),
      ),
    ).toBe(true)
  })

  it('detects working route fields', () => {
    expect(routeSectionHasData('working', baseProfile({ employer_name: 'Acme' }))).toBe(true)
    expect(routeSectionHasData('working', baseProfile({ workplace_latitude: -33.8 }))).toBe(true)
  })

  it('detects visa route fields', () => {
    expect(routeSectionHasData('working_holiday', baseProfile({ visa_subclass: '417' }))).toBe(true)
    expect(routeSectionHasData('working_holiday', baseProfile({ income_band: 'under_400' }))).toBe(true)
    expect(
      routeSectionHasData(
        'backpacker',
        baseProfile({
          visa_doc_url: 'visa/x.pdf',
          visa_submitted_at: '2026-01-01T00:00:00Z',
        }),
      ),
    ).toBe(true)
  })

  it('detects student income band', () => {
    expect(routeSectionHasData('student', baseProfile({ income_band: '400_600' }))).toBe(true)
  })

  it('detects general route income fields', () => {
    expect(routeSectionHasData('retired', baseProfile({ income_band: 'under_400' }))).toBe(true)
    expect(routeSectionHasData('between_jobs', baseProfile({ income_source: 'savings' }))).toBe(true)
  })
})

describe('routeSectionClearPatch', () => {
  it('clears student fields and income on switch away', () => {
    expect(routeSectionClearPatch('student')).toEqual({
      university_id: null,
      campus_id: null,
      course: null,
      study_level: null,
      year_of_study: null,
      enrolment_doc_url: null,
      enrolment_submitted_at: null,
      enrolment_doc_name: null,
      income_band: null,
      income_source: null,
    })
  })

  it('clears working employment, workplace, and income fields', () => {
    const patch = routeSectionClearPatch('working')
    expect(patch.employer_name).toBe(null)
    expect(patch.workplace_latitude).toBe(null)
    expect(patch.income_band).toBe(null)
    expect(patch.income_source).toBe(null)
  })

  it('clears visa fields and income for WH/backpacker', () => {
    expect(routeSectionClearPatch('working_holiday').visa_subclass).toBe(null)
    expect(routeSectionClearPatch('backpacker').visa_doc_url).toBe(null)
    expect(routeSectionClearPatch('working_holiday').visa_doc_verified_at).toBe(null)
    expect(routeSectionClearPatch('backpacker').visa_doc_review_status).toBe(null)
    expect(routeSectionClearPatch('working_holiday').income_band).toBe(null)
    expect(routeSectionClearPatch('backpacker').income_source).toBe(null)
  })

  it('clears income fields for retired/between_jobs', () => {
    expect(routeSectionClearPatch('retired')).toEqual({ income_band: null, income_source: null })
    expect(routeSectionClearPatch('between_jobs')).toEqual({ income_band: null, income_source: null })
  })
})

describe('isRouteSectionComplete', () => {
  it('student requires uni, course, study, income band, enrolment doc', () => {
    const incomplete = baseProfile({
      university_id: '00000000-0000-0000-0000-000000000002',
      course: 'BSc',
      study_level: 'year_2',
    })
    expect(isStudentRouteSectionComplete(incomplete)).toBe(false)
    expect(isRouteSectionComplete('student', incomplete)).toBe(false)

    const complete = baseProfile({
      university_id: '00000000-0000-0000-0000-000000000002',
      course: 'BSc',
      study_level: 'year_2',
      income_band: '400_600',
      enrolment_doc_url: 'enrol/x.pdf',
      enrolment_submitted_at: '2026-01-01T00:00:00Z',
    })
    expect(isStudentRouteSectionComplete(complete)).toBe(true)
    expect(isRouteSectionComplete('student', complete)).toBe(true)
  })

  it('working requires employment fields and workplace coords', () => {
    const incomplete = baseProfile({
      employment_status: 'employed',
      employer_name: 'Acme',
      job_title: 'Engineer',
    })
    expect(isWorkingRouteSectionComplete(incomplete)).toBe(false)

    const complete = baseProfile({
      employment_status: 'employed',
      employer_name: 'Acme',
      job_title: 'Engineer',
      employment_type: 'full_time',
      income_band: '800_1000',
      workplace_latitude: -33.8,
      workplace_longitude: 151.2,
    })
    expect(isWorkingRouteSectionComplete(complete)).toBe(true)
    expect(isRouteSectionComplete('working', complete)).toBe(true)
  })

  it('visa routes require status, subclass, expiry, income band, doc', () => {
    const incomplete = baseProfile({
      visa_status: 'valid',
      visa_subclass: '417',
      visa_expiry: '2027-01-01',
      visa_doc_url: 'visa/x.pdf',
      visa_submitted_at: '2026-01-01T00:00:00Z',
    })
    expect(isVisaRouteSectionComplete(incomplete)).toBe(false)

    const complete = baseProfile({
      visa_status: 'valid',
      visa_subclass: '417',
      visa_expiry: '2027-01-01',
      income_band: '400_600',
      visa_doc_url: 'visa/x.pdf',
      visa_submitted_at: '2026-01-01T00:00:00Z',
    })
    expect(isVisaRouteSectionComplete(complete)).toBe(true)
    expect(isRouteSectionComplete('working_holiday', complete)).toBe(true)
  })

  it('general routes require income band and source', () => {
    const complete = baseProfile({ income_band: '400_600', income_source: 'pension' })
    expect(isGeneralRouteSectionComplete(complete)).toBe(true)
    expect(isRouteSectionComplete('retired', complete)).toBe(true)
  })
})
