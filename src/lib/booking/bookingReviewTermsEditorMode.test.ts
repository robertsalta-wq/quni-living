import { describe, expect, it } from 'vitest'
import { resolveBookingReviewTermsEditorMode } from './bookingReviewTermsEditorMode'

describe('resolveBookingReviewTermsEditorMode', () => {
  it('uses listing terms editor for listing pending_confirmation', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'pending_confirmation',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: null,
        rentBreakdown: null,
      }),
    ).toBe('listing_terms')
  })

  it('uses listing terms editor for listing bond_pending', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'bond_pending',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: 'listing',
        rentBreakdown: null,
      }),
    ).toBe('listing_terms')
  })

  it('does not offer an editable Managed path (API rejects managed agreed-rent)', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'pending_confirmation',
        serviceTierAtRequest: 'managed',
        serviceTierFinal: 'managed',
        rentBreakdown: null,
      }),
    ).toBe('none')
  })

  it('does not mount listing terms editor on Managed bond_pending', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'bond_pending',
        serviceTierAtRequest: 'managed',
        serviceTierFinal: 'managed',
        rentBreakdown: null,
      }),
    ).toBe('none')
  })

  it('allows read-only agreed-rent chrome when a listing override was already applied', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'confirmed',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: 'listing',
        rentBreakdown: {
          override_applied: true,
          agreed_weekly_rent_aud: 400,
        },
      }),
    ).toBe('agreed_rent_readonly')
  })

  it('returns none when inputs are disabled', () => {
    expect(
      resolveBookingReviewTermsEditorMode({
        status: 'pending_confirmation',
        serviceTierAtRequest: 'listing',
        serviceTierFinal: null,
        rentBreakdown: null,
        inputsDisabled: true,
      }),
    ).toBe('none')
  })
})
