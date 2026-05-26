import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingBookingAcceptedEmails: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./triggerListingDocumentGeneration.js', () => ({
  triggerListingDocumentGeneration: vi.fn().mockResolvedValue({ ok: true, skipped: true, reason: 'mock' }),
}))

import { sendListingBookingAcceptedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { runListingConfirmBooking } from './confirmListing.js'

const landlord = { id: 'll1', stripe_customer_id: 'cus_ll' }

const baseBooking = {
  id: '00000000-0000-4000-8000-000000000001',
  landlord_id: 'll1',
  student_id: 'st1',
  property_id: 'pr1',
  status: 'pending_confirmation',
  stripe_payment_intent_id: 'pi_hold',
  service_tier_at_request: 'listing',
}

function mockAdmin(opts: {
  booking?: typeof baseBooking
  updateRows?: unknown[] | null
  eventError?: Error | null
  feeExempt?: boolean
}) {
  const booking = opts.booking ?? baseBooking
  const updateRows = opts.updateRows ?? [{ id: booking.id }]
  const eventError = opts.eventError ?? null
  const feeExempt = opts.feeExempt ?? false

  const from = vi.fn((table: string) => {
    if (table === 'landlord_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { fee_exempt: feeExempt }, error: null }),
          }),
        }),
      }
    }
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: booking, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: async () => ({
                data: updateRows,
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'service_tier_events') {
      return {
        insert: async () => ({ error: eventError }),
      }
    }
    return {}
  })

  return { from }
}

function stripeHappy() {
  return {
    customers: {
      retrieve: vi.fn(async () => ({
        deleted: false,
        invoice_settings: { default_payment_method: { id: 'pm_def', card: { brand: 'visa', last4: '4242' } } },
      })),
    },
    paymentIntents: {
      cancel: vi.fn(async () => ({})),
      create: vi.fn(async () => ({
        id: 'pi_fee',
        status: 'succeeded',
        client_secret: 'cs_test',
      })),
    },
  }
}

describe('runListingConfirmBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: cancel hold, charge $99, bond_pending, telemetry insert', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({})

    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('bond_pending')
    expect(result.listing_fee_payment_intent_id).toBe('pi_fee')
    expect(sendListingBookingAcceptedEmails).toHaveBeenCalledWith(
      expect.anything(),
      baseBooking.id,
      expect.objectContaining({
        bond_window_expires_at: expect.any(String),
      }),
    )
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold')
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 9900,
        currency: 'aud',
        confirm: true,
        off_session: true,
        metadata: expect.objectContaining({
          booking_id: baseBooking.id,
          service_tier: 'listing',
        }),
      }),
      { idempotencyKey: `confirm-listing-${baseBooking.id}` },
    )
    expect(admin.from).toHaveBeenCalledWith('service_tier_events')
  })

  it('fee-exempt landlord: skips listing fee charge', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({ feeExempt: true })

    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.listing_fee_payment_intent_id).toBeNull()
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold')
  })

  it('Phase 3 / Task J: confirm Listing triggers document generation in PREVIEW (defer_signing=true)', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({})

    await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(triggerListingDocumentGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: baseBooking.id,
        deferSigning: true,
      }),
    )
  })

  it('missing default payment method', async () => {
    const stripe = stripeHappy()
    stripe.customers.retrieve = vi.fn(async () => ({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    }))

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('listing_billing_incomplete')
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
  })

  it('declined charge surfaces structured error without booking update', async () => {
    const stripe = stripeHappy()
    stripe.paymentIntents.create = vi.fn(async () => {
      throw Object.assign(new Error('Your card was declined.'), {
        code: 'card_declined',
        decline_code: 'generic_decline',
        type: 'StripeCardError',
      })
    })

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(402)
    expect(result.body.error).toBe('charge_failed')
    expect(admin.from).toHaveBeenCalledWith('bookings')
    const insertCalls = admin.from.mock.calls.filter((c) => c[0] === 'service_tier_events')
    expect(insertCalls.length).toBe(0)
  })

  it('requires_action (authentication_required)', async () => {
    const stripe = stripeHappy()
    stripe.paymentIntents.create = vi.fn(async () => {
      throw Object.assign(new Error('Authentication required'), {
        code: 'authentication_required',
        type: 'StripeCardError',
        payment_intent: {
          id: 'pi_auth',
          client_secret: 'cs_secret',
          status: 'requires_action',
        },
      })
    })

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(402)
    expect(result.body.requires_action).toBe(true)
    expect(result.body.client_secret).toBe('cs_secret')
  })

  it('when update matches no row but booking is already bond_pending, returns idempotent success', async () => {
    const stripe = stripeHappy()
    let maybeSingleCalls = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'landlord_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { fee_exempt: false }, error: null }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  maybeSingleCalls += 1
                  if (maybeSingleCalls === 1) {
                    return { data: baseBooking, error: null }
                  }
                  return {
                    data: {
                      ...baseBooking,
                      status: 'bond_pending',
                      bond_window_expires_at: '2099-01-01T00:00:00.000Z',
                    },
                    error: null,
                  }
                },
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'service_tier_events') {
          return { insert: async () => ({ error: null }) }
        }
        return {}
      }),
    }

    const r = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.idempotent).toBe(true)
  })
})
