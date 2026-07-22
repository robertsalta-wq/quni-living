import { describe, expect, it } from 'vitest'
import { bookingReviewTermsEditorPathApplies } from './LandlordBookingTermsEditor'

describe('bookingReviewTermsEditorPathApplies', () => {
  it('listing pending_confirmation can edit', () => {
    expect(
      bookingReviewTermsEditorPathApplies({
        status: 'pending_confirmation',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: null,
        overrideApplied: false,
      }),
    ).toBe(true)
  })

  it('Managed booking never opens editor, even with overrideApplied', () => {
    expect(
      bookingReviewTermsEditorPathApplies({
        status: 'pending_confirmation',
        serviceTierAtRequest: 'managed',
        serviceTierFinal: 'managed',
        overrideApplied: true,
      }),
    ).toBe(false)
  })

  it('Managed awaiting_info with overrideApplied still blocked', () => {
    expect(
      bookingReviewTermsEditorPathApplies({
        status: 'awaiting_info',
        serviceTierAtRequest: 'managed',
        serviceTierFinal: null,
        overrideApplied: true,
      }),
    ).toBe(false)
  })

  it('listing with overrideApplied can show editor after early statuses', () => {
    expect(
      bookingReviewTermsEditorPathApplies({
        status: 'confirmed',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: 'listing',
        overrideApplied: true,
      }),
    ).toBe(true)
  })

  it('listing without override and non-editable status cannot edit', () => {
    expect(
      bookingReviewTermsEditorPathApplies({
        status: 'confirmed',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: 'listing',
        overrideApplied: false,
      }),
    ).toBe(false)
  })
})
