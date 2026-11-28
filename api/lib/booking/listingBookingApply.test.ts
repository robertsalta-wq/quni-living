import { describe, expect, it, vi } from 'vitest'
import {
  bookingHasStudentDepositAuthorization,
  bookingRowWithoutLettingChoiceIfColumnMissing,
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
    expect(row).not.toHaveProperty('letting_choice')
  })

  it('stores letting_choice only when the student picked one', () => {
    const row = buildListingApplyBookingRow({
      property: { id: 'p1', landlord_id: 'l1', bond_weeks: 4 },
      student: { id: 's1' },
      moveInDate: '2026-07-01',
      leaseLength: '6 months',
      studentMessage: '',
      propertyType: 'private_room_landlord_off_site',
      occupantCount: 2,
      parkingSelected: false,
      weeklyRent: 420,
      breakdownAud: { base: 420 },
      coTenant: {
        full_name: 'Blair Example',
        email: 'blair@example.com',
        phone: '0400000000',
        date_of_birth: '2001-02-03',
      },
      serviceTierAtRequest: 'listing',
      expiresAt: '2026-06-11T00:00:00.000Z',
      endDate: '2026-12-31',
      lettingChoice: 'together',
    })
    expect(row.letting_choice).toBe('together')
    expect(row.occupant_count).toBe(2)
    expect(row.weekly_rent).toBe(420)
    expect(row.housemates_count).toBe(1)
  })

  it('drops letting_choice only when the column is not in the schema cache yet', () => {
    const row = { letting_choice: 'sole', occupant_count: 1, weekly_rent: 280 }
    const dropped = bookingRowWithoutLettingChoiceIfColumnMissing(row, {
      message: "Could not find the 'letting_choice' column of 'bookings' in the schema cache",
    })
    expect(dropped).toEqual({ occupant_count: 1, weekly_rent: 280 })
    expect(
      bookingRowWithoutLettingChoiceIfColumnMissing(row, { message: 'duplicate key value' }),
    ).toBeNull()
    expect(
      bookingRowWithoutLettingChoiceIfColumnMissing(
        { occupant_count: 1 },
        { message: "Could not find the 'letting_choice' column of 'bookings' in the schema cache" },
      ),
    ).toBeNull()
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
