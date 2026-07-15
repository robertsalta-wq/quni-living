import { describe, expect, it } from 'vitest'
import {
  bookingReviewReadinessAllClear,
  bookingReviewReadinessHint,
  resolveBookingReviewReadinessGates,
  type BookingReviewReadinessGatesInput,
} from './bookingReviewReadinessGates'

function baseInput(overrides: Partial<BookingReviewReadinessGatesInput> = {}): BookingReviewReadinessGatesInput {
  return {
    selectedConfirmTier: 'listing',
    stripeChargesEnabled: false,
    adminOverrideVerified: false,
    property: { id: 'prop-1', status: 'active', property_type: 'apartment', state: 'NSW', is_registered_rooming_house: false },
    booking: { move_in_date: '2026-07-07', start_date: '2026-07-07' },
    listingUsesOccupancyAgreement: false,
    propertyPayoutComplete: false,
    listingFeeExempt: false,
    listingBillingLoaded: true,
    listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
    ...overrides,
  }
}

describe('resolveBookingReviewReadinessGates', () => {
  it('marks identity as the first "current" gate when everything is incomplete', () => {
    const gates = resolveBookingReviewReadinessGates(baseInput())
    const identity = gates.find((g) => g.id === 'host_identity')
    expect(identity?.state).toBe('current')
    // Later incomplete gates behind the first are "todo", not "current".
    const billing = gates.find((g) => g.id === 'billing_card')
    expect(billing?.state).toBe('todo')
  })

  it('moves "current" to the billing card once identity is verified (ordering: first incomplete = current)', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ stripeChargesEnabled: true }),
    )
    const identity = gates.find((g) => g.id === 'host_identity')
    const listingActive = gates.find((g) => g.id === 'listing_active')
    const billing = gates.find((g) => g.id === 'billing_card')
    expect(identity?.state).toBe('done')
    expect(listingActive?.state).toBe('done')
    expect(billing?.state).toBe('current')
  })

  it('is all-clear (done) once identity + billing card are both satisfied for a fee-exempt-false listing', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({
        stripeChargesEnabled: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: true, card: { brand: 'visa', last4: '4242' } },
      }),
    )
    expect(bookingReviewReadinessAllClear(gates)).toBe(true)
  })

  it('omits the billing card gate entirely when the landlord is fee-exempt', () => {
    const gates = resolveBookingReviewReadinessGates(baseInput({ listingFeeExempt: true, stripeChargesEnabled: true }))
    expect(gates.find((g) => g.id === 'billing_card')).toBeUndefined()
    expect(bookingReviewReadinessAllClear(gates)).toBe(true)
  })

  it('omits the payout-method gate for Listing without an occupancy agreement', () => {
    const gates = resolveBookingReviewReadinessGates(baseInput({ listingUsesOccupancyAgreement: false }))
    expect(gates.find((g) => g.id === 'payout_method')).toBeUndefined()
  })

  it('includes the payout-method gate for Listing + occupancy agreement, gated on propertyPayoutComplete', () => {
    const incomplete = resolveBookingReviewReadinessGates(
      baseInput({ listingUsesOccupancyAgreement: true, propertyPayoutComplete: false, stripeChargesEnabled: true }),
    )
    expect(incomplete.find((g) => g.id === 'payout_method')?.state).not.toBe('done')

    const complete = resolveBookingReviewReadinessGates(
      baseInput({ listingUsesOccupancyAgreement: true, propertyPayoutComplete: true, stripeChargesEnabled: true }),
    )
    expect(complete.find((g) => g.id === 'payout_method')?.state).toBe('done')
  })

  it('includes a Stripe-backed payout-method gate for Managed, no billing card gate', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ selectedConfirmTier: 'managed', stripeChargesEnabled: false }),
    )
    expect(gates.find((g) => g.id === 'billing_card')).toBeUndefined()
    const payout = gates.find((g) => g.id === 'payout_method')
    expect(payout).toBeDefined()
    expect(payout?.state).not.toBe('done')
  })

  it('flags "Listing is active" as incomplete when the property is paused/inactive', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ stripeChargesEnabled: true, property: { id: 'prop-1', status: 'inactive', property_type: 'apartment', state: 'NSW', is_registered_rooming_house: false } }),
    )
    expect(gates.find((g) => g.id === 'listing_active')?.state).toBe('current')
  })

  it('bookingReviewReadinessHint mirrors the first incomplete gate label', () => {
    const gates = resolveBookingReviewReadinessGates(baseInput())
    expect(bookingReviewReadinessHint(gates)).toContain('Identity verified')
  })

  it('bookingReviewReadinessHint is null once all gates are done', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({
        stripeChargesEnabled: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: true, card: null },
      }),
    )
    expect(bookingReviewReadinessHint(gates)).toBeNull()
  })

  it('admin_override_verified alone satisfies identity for Listing (mirrors landlordProfileHostIdentityVerified)', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ stripeChargesEnabled: false, adminOverrideVerified: true }),
    )
    expect(gates.find((g) => g.id === 'host_identity')?.state).toBe('done')
  })
})
