import { describe, expect, it } from 'vitest'
import { parseRenterSectionHash, renterProfilePath } from './renterProfilePaths'
import { renterProfileDefaultExpandedSection } from './renterProfileSection'

describe('parseRenterSectionHash', () => {
  it('maps known hashes to expand keys', () => {
    expect(parseRenterSectionHash('#renter-section-personal')).toEqual({
      expand: 'personal',
      scrollId: 'renter-section-personal',
    })
    expect(parseRenterSectionHash('renter-section-guarantor')).toEqual({
      expand: 'route',
      openGuarantor: true,
      scrollId: 'renter-section-guarantor',
    })
  })

  it('returns null for unknown hashes', () => {
    expect(parseRenterSectionHash('#nope')).toBeNull()
  })
})

describe('renterProfilePath', () => {
  it('builds student-profile hash paths', () => {
    expect(renterProfilePath()).toBe('/student-profile')
    expect(renterProfilePath('verification')).toBe('/student-profile#renter-section-verification')
    expect(renterProfilePath('guarantor')).toBe('/student-profile#renter-section-guarantor')
  })
})

describe('renterProfileDefaultExpandedSection', () => {
  const base = {
    situation: 'student' as const,
    personalComplete: true,
    verificationComplete: true,
    routeComplete: true,
    showGuarantor: false,
    guarantorComplete: true,
    emergencyComplete: true,
  }

  it('opens situation when unset', () => {
    expect(renterProfileDefaultExpandedSection({ ...base, situation: null })).toBe('situation')
  })

  it('walks incomplete required sections in order', () => {
    expect(renterProfileDefaultExpandedSection({ ...base, personalComplete: false })).toBe('personal')
    expect(renterProfileDefaultExpandedSection({ ...base, verificationComplete: false })).toBe(
      'verification',
    )
    expect(renterProfileDefaultExpandedSection({ ...base, routeComplete: false })).toBe('route')
    expect(
      renterProfileDefaultExpandedSection({
        ...base,
        showGuarantor: true,
        guarantorComplete: false,
      }),
    ).toBe('route')
    expect(renterProfileDefaultExpandedSection({ ...base, emergencyComplete: false })).toBe(
      'emergency',
    )
  })

  it('returns null when required sections are complete', () => {
    expect(renterProfileDefaultExpandedSection(base)).toBeNull()
  })
})
