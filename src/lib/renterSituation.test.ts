import { describe, expect, it } from 'vitest'
import {
  deriveAccommodationRouteFromSituation,
  effectiveAccommodationRoute,
  hasRenterSituationChosen,
} from './renterSituation'

describe('deriveAccommodationRouteFromSituation', () => {
  it('maps student to student route', () => {
    expect(deriveAccommodationRouteFromSituation('student')).toBe('student')
  })

  it('maps all non-student situations to non_student route', () => {
    for (const situation of [
      'working',
      'working_holiday',
      'backpacker',
      'retired',
      'between_jobs',
    ] as const) {
      expect(deriveAccommodationRouteFromSituation(situation)).toBe('non_student')
    }
  })

  it('returns null when situation unset', () => {
    expect(deriveAccommodationRouteFromSituation(null)).toBe(null)
    expect(deriveAccommodationRouteFromSituation('')).toBe(null)
  })
})

describe('effectiveAccommodationRoute', () => {
  it('prefers stored route over situation', () => {
    expect(
      effectiveAccommodationRoute({
        accommodation_verification_route: 'non_student',
        renter_situation: 'student',
      }),
    ).toBe('non_student')
  })

  it('infers route from situation when column not yet saved', () => {
    expect(
      effectiveAccommodationRoute({
        accommodation_verification_route: null,
        renter_situation: 'working',
      }),
    ).toBe('non_student')
  })
})

describe('hasRenterSituationChosen', () => {
  it('is true when backfilled student situation is set', () => {
    expect(hasRenterSituationChosen({ renter_situation: 'student' })).toBe(true)
  })

  it('is false for legacy non_student rows pending section 0', () => {
    expect(
      hasRenterSituationChosen({
        renter_situation: null,
        accommodation_verification_route: 'non_student',
      }),
    ).toBe(false)
  })
})
