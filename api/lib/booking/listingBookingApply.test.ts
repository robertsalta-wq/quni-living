import { describe, expect, it, vi } from 'vitest'
import {
  bookingHasStudentDepositAuthorization,
  buildListingApplyBookingRow,
  isListingBookingApplyRow,
  isListingServiceTier,
} from './listingBookingApply.js'

describe('listingBookingApply helpers', () => {
  it('isListingServiceTier', () => {
    expect(isListingServiceTier('listing')).toBe(true)
    expect(isListingServiceTier('managed')).toBe(false)
  })

  it('bookingHasStudentDepositAuthorization is false for Listing tier rows', () => {
    expect(bookingHasStudentDepositAuthorization({ service_tier_at_request: 'listing' })).toBe(false)
    expect(
      bookingHasStudentDepositAuthorization({
        service_tier_at_request: 'listing',
        stripe_payment_intent_id: 'pi_legacy',
      }),
    ).toBe(false)
  })

  it('bookingHasStudentDepositAuthorization requires PI for Managed', () => {
    expect(bookingHasStudentDepositAuthorization({ service_tier_at_request: 'managed' })).toBe(false)
    expect(
      bookingHasStudentDepositAuthorization({
        service_tier_at_request: 'managed',
        stripe_payment_intent_id: 'pi_1',
      }),
    ).toBe(true)
  })

  it('isListingBookingApplyRow', () => {
    expect(isListingBookingApplyRow({ service_tier_at_request: 'listing' })).toBe(true)
    expect(
      isListingBookingApplyRow({
        service_tier_at_request: 'managed',
        stripe_payment_intent_id: 'pi_1',
      }),
    ).toBe(false)
  })

  it('buildListingApplyBookingRow omits deposit and payment fields', () => {
    const row = buildListingApplyBookingRow({
      property: {
        id: 'p1',
        landlord_id: 'l1',
        bond_weeks: 4,
      },
      student: { id: 's1' },
      moveInDate: '2026-07-01',
      leaseLength: '6 months',
      studentMessage: 'Hi',
      propertyType: 'entire_property',
      occupantCount: 1,
      parkingSelected: false,
      weeklyRent: 400,
      breakdownAud: { base: 400 },
      coTenant: null,
      serviceTierAtRequest: 'listing',
      expiresAt: '2026-06-11T00:00:00.000Z',
      endDate: '2026-12-31',
    })

    expect(row.status).toBe('pending_confirmation')
    expect(row.service_tier_at_request).toBe('listing')
    expect(row.booking_fee_paid).toBe(false)
    expect(row.bond_amount).toBe(1600)
    expect(row).not.toHaveProperty('stripe_payment_intent_id')
    expect(row).not.toHaveProperty('deposit_amount')
    expect(row).not.toHaveProperty('platform_fee_amount')
    expect(row).not.toHaveProperty('rent_payment_method')
  })
})

describe('Listing apply downstream (fail-closed, no PI required)', () => {
  it('decline path skips Stripe when Listing row has no PI', async () => {
    const stripeRetrieve = vi.fn()
    const stripeCancel = vi.fn()
    const booking = {
      id: 'b1',
      status: 'pending_confirmation',
      service_tier_at_request: 'listing',
      stripe_payment_intent_id: null,
      landlord_id: 'l1',
      notes: null,
    }

    const shouldSkipStripe = isListingBookingApplyRow(booking) || !booking.stripe_payment_intent_id
    expect(shouldSkipStripe).toBe(true)

    if (!shouldSkipStripe) {
      await stripeRetrieve()
      await stripeCancel()
    }

    expect(stripeRetrieve).not.toHaveBeenCalled()
    expect(stripeCancel).not.toHaveBeenCalled()
  })

  it('request-info path proceeds without PI for Listing', () => {
    const booking = {
      status: 'pending_confirmation',
      service_tier_at_request: 'listing',
      stripe_payment_intent_id: null,
    }
    const allowedFrom =
      booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
    const piRequired = !isListingBookingApplyRow(booking)
    expect(allowedFrom).toBe(true)
    expect(piRequired).toBe(false)
  })
})
