import { describe, expect, it } from 'vitest'
import { landlordBookingConfirmBlockedUserMessage } from '../landlordBookingConfirmGate'
import {
  bookingReviewHasNonGateBlocker,
  bookingReviewReadinessAllClear,
  bookingReviewReadinessHint,
  bookingReviewShowReadyRibbon,
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
  it('omits host identity for Listing and marks payout as the first current gate when incomplete', () => {
    const gates = resolveBookingReviewReadinessGates(baseInput())
    expect(gates.find((g) => g.id === 'host_identity')).toBeUndefined()
    const payout = gates.find((g) => g.id === 'payout_method')
    expect(payout?.state).toBe('current')
    const billing = gates.find((g) => g.id === 'billing_card')
    expect(billing?.state).toBe('todo')
  })

  it('moves "current" to the payout method when listing is active but payout is incomplete', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ stripeChargesEnabled: false }),
    )
    expect(gates.find((g) => g.id === 'host_identity')).toBeUndefined()
    const listingActive = gates.find((g) => g.id === 'listing_active')
    const payout = gates.find((g) => g.id === 'payout_method')
    expect(listingActive?.state).toBe('done')
    expect(payout?.state).toBe('current')
  })

  it('is all-clear (done) once payout + billing card are satisfied for a fee-exempt-false listing', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({
        stripeChargesEnabled: true,
        propertyPayoutComplete: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: true, card: { brand: 'visa', last4: '4242' } },
      }),
    )
    expect(bookingReviewReadinessAllClear(gates)).toBe(true)
  })

  it('omits the billing card gate entirely when the landlord is fee-exempt', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ listingFeeExempt: true, stripeChargesEnabled: true, propertyPayoutComplete: true }),
    )
    expect(gates.find((g) => g.id === 'billing_card')).toBeUndefined()
    expect(bookingReviewReadinessAllClear(gates)).toBe(true)
  })

  it('includes the payout-method gate for all Listing bookings, gated on propertyPayoutComplete', () => {
    const incomplete = resolveBookingReviewReadinessGates(
      baseInput({ propertyPayoutComplete: false, stripeChargesEnabled: true }),
    )
    expect(incomplete.find((g) => g.id === 'payout_method')?.state).not.toBe('done')

    const complete = resolveBookingReviewReadinessGates(
      baseInput({ propertyPayoutComplete: true, stripeChargesEnabled: true }),
    )
    expect(complete.find((g) => g.id === 'payout_method')?.state).toBe('done')
  })

  it('still includes the payout-method gate for Listing without an occupancy agreement', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ listingUsesOccupancyAgreement: false, propertyPayoutComplete: true, stripeChargesEnabled: true }),
    )
    expect(gates.find((g) => g.id === 'payout_method')).toBeDefined()
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
    expect(bookingReviewReadinessHint(gates)).toContain('Add a payout method')
  })

  it('bookingReviewReadinessHint is null once all gates are done', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({
        stripeChargesEnabled: true,
        propertyPayoutComplete: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: true, card: null },
      }),
    )
    expect(bookingReviewReadinessHint(gates)).toBeNull()
  })

  it('omits host identity for Listing even without Connect or admin override', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ stripeChargesEnabled: false, adminOverrideVerified: false }),
    )
    expect(gates.find((g) => g.id === 'host_identity')).toBeUndefined()
  })

  it('keeps host identity for Managed until Stripe charges are enabled', () => {
    const gates = resolveBookingReviewReadinessGates(
      baseInput({ selectedConfirmTier: 'managed', stripeChargesEnabled: false, adminOverrideVerified: true }),
    )
    expect(gates.find((g) => g.id === 'host_identity')?.state).toBe('current')
  })

  it('module-disabled with all gates clear must not show the ready ribbon; surface the specific block message', () => {
    // Gates can be all clear while Listing is globally paused (no user-fixable gate).
    const gates = resolveBookingReviewReadinessGates(
      baseInput({
        stripeChargesEnabled: true,
        propertyPayoutComplete: true,
        listingBilling: { moduleEnabled: false, hasPaymentMethod: true, card: null },
      }),
    )
    expect(bookingReviewReadinessAllClear(gates)).toBe(true)
    // canConfirm is false when module is paused - ribbon must stay off.
    expect(bookingReviewShowReadyRibbon({ readinessAllClear: true, canConfirm: false })).toBe(false)
    expect(bookingReviewHasNonGateBlocker({ readinessAllClear: true, canConfirm: false })).toBe(true)
    expect(landlordBookingConfirmBlockedUserMessage('listing_module_disabled', 'pending_confirmation')).toBe(
      'Listing bookings are temporarily paused. Try again in a few minutes.',
    )
  })

  it('billing-unavailable with all gates clear must not show the ready ribbon; surface the specific block message', () => {
    expect(bookingReviewShowReadyRibbon({ readinessAllClear: true, canConfirm: false })).toBe(false)
    expect(landlordBookingConfirmBlockedUserMessage('listing_billing_unavailable', 'pending_confirmation')).toBe(
      'Could not verify Listing billing. Refresh this page and try again.',
    )
  })
})
