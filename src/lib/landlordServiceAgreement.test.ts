import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import {
  LANDLORD_SERVICE_AGREEMENT_VERSION,
  landlordServiceAgreementAcceptancePatch,
  landlordServiceAgreementAccepted,
} from './landlordServiceAgreement'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

function profile(
  overrides: Partial<Pick<LandlordRow, 'landlord_terms_accepted_at' | 'landlord_service_agreement_version'>>,
): Pick<LandlordRow, 'landlord_terms_accepted_at' | 'landlord_service_agreement_version'> {
  return {
    landlord_terms_accepted_at: null,
    landlord_service_agreement_version: null,
    ...overrides,
  }
}

describe('landlordServiceAgreementAccepted', () => {
  it('is false when the landlord has never accepted', () => {
    expect(landlordServiceAgreementAccepted(profile({}) as LandlordRow)).toBe(false)
  })

  it('is false for a March 2026 timestamp with no version (legacy Listing acceptance)', () => {
    expect(
      landlordServiceAgreementAccepted(
        profile({ landlord_terms_accepted_at: '2026-03-23T00:00:00.000Z' }) as LandlordRow,
      ),
    ).toBe(false)
  })

  it('is true when the stored version matches Listing 1.0', () => {
    expect(
      landlordServiceAgreementAccepted(
        profile({
          landlord_terms_accepted_at: '2026-03-23T00:00:00.000Z',
          landlord_service_agreement_version: LANDLORD_SERVICE_AGREEMENT_VERSION,
        }) as LandlordRow,
      ),
    ).toBe(true)
  })

  it('treats a timestamp on or after 3 September 2026 as v1.0 when the version column is absent', () => {
    expect(
      landlordServiceAgreementAccepted(
        profile({ landlord_terms_accepted_at: '2026-09-03T00:00:00.000Z' }) as LandlordRow,
      ),
    ).toBe(true)
  })

  it('is false when a different version is stored', () => {
    expect(
      landlordServiceAgreementAccepted(
        profile({
          landlord_terms_accepted_at: '2026-09-03T00:00:00.000Z',
          landlord_service_agreement_version: 'managed-1.0',
        }) as LandlordRow,
      ),
    ).toBe(false)
  })
})

describe('landlordServiceAgreementAcceptancePatch', () => {
  it('records Listing 1.0 and the given timestamp', () => {
    expect(landlordServiceAgreementAcceptancePatch('2026-09-03T12:00:00.000Z')).toEqual({
      landlord_terms_accepted_at: '2026-09-03T12:00:00.000Z',
      landlord_service_agreement_version: 'listing-1.0',
    })
  })
})
