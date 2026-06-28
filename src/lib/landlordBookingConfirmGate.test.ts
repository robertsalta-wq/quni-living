import { describe, expect, it } from 'vitest'
import {
  landlordBookingConfirmAllowed,
  landlordBookingConfirmBlockedBanner,
  landlordBookingConfirmBlockedUserMessage,
} from './landlordBookingConfirmGate'

const readyListing = { moduleEnabled: true, hasPaymentMethod: true, card: null }

describe('landlordBookingConfirmAllowed', () => {
  const pipeline = 'pending_confirmation' as const

  it('blocks when status is not in pipeline', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: 'confirmed',
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: false,
      }),
    ).toBe(false)
  })

  it('listing: requires module + card', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: false,
        listingBilling: null,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: null,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: false, hasPaymentMethod: true, card: null },
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(true)
  })

  it('listing: admin override satisfies identity without Stripe charges', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: true,
      }),
    ).toBe(true)
  })

  it('listing: blocks boarder/lodger when payout details incomplete', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
        listingUsesOccupancyAgreement: true,
        propertyPayoutComplete: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
        listingUsesOccupancyAgreement: true,
        propertyPayoutComplete: true,
      }),
    ).toBe(true)
  })

  it('listing: fee-exempt landlord can accept without a saved card', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: false,
        adminOverrideVerified: true,
        listingFeeExempt: true,
      }),
    ).toBe(true)
  })

  it('managed: requires Connect', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'managed',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: false,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'managed',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe(true)
  })

  it('managed: admin override does not bypass Stripe charges', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        selectedConfirmTier: 'managed',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: true,
      }),
    ).toBe(false)
  })
})

describe('landlordBookingConfirmBlockedBanner', () => {
  const pipeline = 'pending_confirmation' as const

  it('managed without Stripe identity shows host identity banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'managed',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        stripeChargesEnabled: false,
        adminOverrideVerified: false,
      }),
    ).toBe('host_identity_required')
  })

  it('listing without Stripe identity shows host identity banner before billing checks', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: false,
        adminOverrideVerified: false,
      }),
    ).toBe('host_identity_required')
  })

  it('listing with admin override skips host identity banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: false,
        adminOverrideVerified: true,
      }),
    ).toBe('listing_no_payment_method')
  })

  it('listing payout missing shows payout banner before billing', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
        listingUsesOccupancyAgreement: true,
        propertyPayoutComplete: false,
      }),
    ).toBe('listing_payout_details_missing')
  })

  it('listing fee-exempt skips card requirement banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: false,
        adminOverrideVerified: true,
        listingFeeExempt: true,
      }),
    ).toBe(null)
  })

  it('listing module off shows module banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: false, hasPaymentMethod: true, card: null },
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe('listing_module_disabled')
  })

  it('listing billing fetch failed', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: null,
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe('listing_billing_unavailable')
  })

  it('listing no card when module on', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        selectedConfirmTier: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        stripeChargesEnabled: true,
        adminOverrideVerified: false,
      }),
    ).toBe('listing_no_payment_method')
  })
})

describe('landlordBookingConfirmBlockedUserMessage', () => {
  it('returns copy for each banner type', () => {
    expect(landlordBookingConfirmBlockedUserMessage('host_identity_required', 'pending_confirmation')).toMatch(
      /Stripe identity/i,
    )
    expect(landlordBookingConfirmBlockedUserMessage('listing_no_payment_method', 'pending_confirmation')).toMatch(
      /saved card/i,
    )
  })
})
