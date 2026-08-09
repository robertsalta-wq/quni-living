import { describe, expect, it } from 'vitest'
import {
  bookingStatusShowsLeaseAgreementSurface,
  shouldOfferLandlordAgreementListAction,
  shouldOfferLandlordTerminationListAction,
} from './signedAgreementAvailability'

describe('shouldOfferLandlordAgreementListAction', () => {
  it('offers download for any status when a signed PDF path exists', () => {
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: true, status: 'terminated' }),
    ).toBe(true)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: true, status: 'expired' }),
    ).toBe(true)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: true, status: 'completed' }),
    ).toBe(true)
  })

  it('offers open agreement only while signing is live', () => {
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: false, status: 'confirmed' }),
    ).toBe(true)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: false, status: 'active' }),
    ).toBe(true)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: false, status: 'bond_pending' }),
    ).toBe(true)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: false, status: 'terminated' }),
    ).toBe(false)
    expect(
      shouldOfferLandlordAgreementListAction({ hasSignedPaths: false, status: 'expired' }),
    ).toBe(false)
  })
})

describe('shouldOfferLandlordTerminationListAction', () => {
  it('offers only when a signed mutual-termination path exists', () => {
    expect(shouldOfferLandlordTerminationListAction(true)).toBe(true)
    expect(shouldOfferLandlordTerminationListAction(false)).toBe(false)
  })
})

describe('bookingStatusShowsLeaseAgreementSurface', () => {
  it('includes completed and termination statuses', () => {
    expect(bookingStatusShowsLeaseAgreementSurface('completed')).toBe(true)
    expect(bookingStatusShowsLeaseAgreementSurface('terminated')).toBe(true)
    expect(bookingStatusShowsLeaseAgreementSurface('pending_confirmation')).toBe(false)
  })
})
