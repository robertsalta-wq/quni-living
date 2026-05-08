import { describe, expect, it } from 'vitest'
import {
  landlordBookingConfirmAllowed,
  landlordBookingConfirmBlockedBanner,
} from './landlordBookingConfirmGate'

const readyListing = { moduleEnabled: true, hasPaymentMethod: true, card: null }

describe('landlordBookingConfirmAllowed', () => {
  const pipeline = 'pending_confirmation' as const

  it('blocks when status is not in pipeline', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: 'confirmed',
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        landlordStripeReady: false,
      }),
    ).toBe(false)
  })

  it('listing: requires module + card', () => {
    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: false,
        listingBilling: null,
        landlordStripeReady: true,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: null,
        landlordStripeReady: true,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: false, hasPaymentMethod: true, card: null },
        landlordStripeReady: true,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        landlordStripeReady: true,
      }),
    ).toBe(false)

    expect(
      landlordBookingConfirmAllowed({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: readyListing,
        landlordStripeReady: false,
      }),
    ).toBe(true)
  })

  it('managed + legacy null: requires Connect', () => {
    for (const tier of ['managed', null] as const) {
      expect(
        landlordBookingConfirmAllowed({
          bookingStatus: pipeline,
          serviceTierAtRequest: tier,
          listingBillingLoaded: true,
          listingBilling: readyListing,
          landlordStripeReady: false,
        }),
      ).toBe(false)

      expect(
        landlordBookingConfirmAllowed({
          bookingStatus: pipeline,
          serviceTierAtRequest: tier,
          listingBillingLoaded: true,
          listingBilling: readyListing,
          landlordStripeReady: true,
        }),
      ).toBe(true)
    }
  })
})

describe('landlordBookingConfirmBlockedBanner', () => {
  const pipeline = 'pending_confirmation' as const

  it('managed/null without Connect shows connect banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        serviceTierAtRequest: null,
        listingBillingLoaded: true,
        listingBilling: readyListing,
        landlordStripeReady: false,
      }),
    ).toBe('managed_connect_required')
  })

  it('listing module off shows module banner', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: false, hasPaymentMethod: true, card: null },
        landlordStripeReady: true,
      }),
    ).toBe('listing_module_disabled')
  })

  it('listing billing fetch failed', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: null,
        landlordStripeReady: true,
      }),
    ).toBe('listing_billing_unavailable')
  })

  it('listing no card when module on', () => {
    expect(
      landlordBookingConfirmBlockedBanner({
        bookingStatus: pipeline,
        serviceTierAtRequest: 'listing',
        listingBillingLoaded: true,
        listingBilling: { moduleEnabled: true, hasPaymentMethod: false, card: null },
        landlordStripeReady: true,
      }),
    ).toBe('listing_no_payment_method')
  })
})
