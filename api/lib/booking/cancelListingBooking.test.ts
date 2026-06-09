import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchListingFeePaymentIntentId: vi.fn(),
  refundListingFeePaymentIntentFull: vi.fn(),
  sendListingCancelledByLandlordEmails: vi.fn(),
}))

vi.mock('./listingFeePaymentIntent.js', () => ({
  fetchListingFeePaymentIntentId: mocks.fetchListingFeePaymentIntentId,
  refundListingFeePaymentIntentFull: mocks.refundListingFeePaymentIntentFull,
}))

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingCancelledByLandlordEmails: mocks.sendListingCancelledByLandlordEmails,
}))

import { runCancelListingBookingLandlord } from './cancelListingBooking.js'

const llId = 'll1'
const bookingId = '00000000-0000-4000-8000-000000000001'

function stripeOk() {
  return {} as never
}

describe('runCancelListingBookingLandlord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: refund, cancelled row, telemetry + emails', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')
    mocks.refundListingFeePaymentIntentFull.mockResolvedValue({
      refundId: 're_123',
      refundAmountCents: 9900,
    })

    let bookingsPhase = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'bookings') {
          bookingsPhase += 1
          if (bookingsPhase === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: bookingId,
                      landlord_id: llId,
                      student_id: 'st1',
                      property_id: 'pr1',
                      status: 'bond_pending',
                      service_tier_final: 'listing',
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: async () => ({
                    data: [{ id: bookingId, status: 'cancelled' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'service_tier_events') {
          return {
            insert: async () => ({ error: null }),
          }
        }
        return {}
      }),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
      cancellationReason: ' changed plans ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(false)
    expect(mocks.refundListingFeePaymentIntentFull).toHaveBeenCalled()
    expect(mocks.sendListingCancelledByLandlordEmails).toHaveBeenCalledTimes(1)
  })

  it('wrong tier rejected', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: bookingId,
                landlord_id: llId,
                student_id: 'st1',
                property_id: 'pr1',
                status: 'bond_pending',
                service_tier_final: 'managed',
              },
              error: null,
            }),
          }),
        }),
      })),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('wrong_tier')
    expect(mocks.refundListingFeePaymentIntentFull).not.toHaveBeenCalled()
  })

  it('wrong status rejected', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: bookingId,
                landlord_id: llId,
                student_id: 'st1',
                property_id: 'pr1',
                status: 'confirmed',
                service_tier_final: 'listing',
              },
              error: null,
            }),
          }),
        }),
      })),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_status')
  })

  it('idempotent when already cancelled', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: bookingId,
                landlord_id: llId,
                student_id: 'st1',
                property_id: 'pr1',
                status: 'cancelled',
                service_tier_final: 'listing',
              },
              error: null,
            }),
          }),
        }),
      })),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(true)
    expect(mocks.fetchListingFeePaymentIntentId).not.toHaveBeenCalled()
  })

  it('landlord ownership enforced', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: bookingId,
                landlord_id: 'other',
                student_id: 'st1',
                property_id: 'pr1',
                status: 'bond_pending',
                service_tier_final: 'listing',
              },
              error: null,
            }),
          }),
        }),
      })),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('forbidden')
  })

  it('fee-exempt (no PI): cancelled without refund, telemetry + emails', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue(null)

    let eventInsert: Record<string, unknown> | null = null
    let bookingsPhase = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'bookings') {
          bookingsPhase += 1
          if (bookingsPhase === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: bookingId,
                      landlord_id: llId,
                      student_id: 'st1',
                      property_id: 'pr1',
                      status: 'bond_pending',
                      service_tier_final: 'listing',
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: async () => ({
                    data: [{ id: bookingId, status: 'cancelled' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'service_tier_events') {
          return {
            insert: async (row: Record<string, unknown>) => {
              eventInsert = row
              return { error: null }
            },
          }
        }
        return {}
      }),
    }

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(false)
    expect(result.refundId).toBeNull()
    expect(result.refundAmountCents).toBeNull()
    expect(mocks.refundListingFeePaymentIntentFull).not.toHaveBeenCalled()
    expect(mocks.sendListingCancelledByLandlordEmails).toHaveBeenCalledTimes(1)
    expect(eventInsert).toMatchObject({
      event_type: 'bond_pending_cancelled_by_landlord',
      service_tier: 'listing',
    })
    expect(eventInsert?.metadata).toMatchObject({ fee_exempt: true })
    expect(eventInsert?.metadata).not.toHaveProperty('stripe_payment_intent_id')
  })

  it('email failure does not fail cancel success path', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')
    mocks.refundListingFeePaymentIntentFull.mockResolvedValue({
      refundId: 're_123',
      refundAmountCents: 9900,
    })
    mocks.sendListingCancelledByLandlordEmails.mockRejectedValueOnce(new Error('smtp'))

    let bookingsPhase = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'bookings') {
          bookingsPhase += 1
          if (bookingsPhase === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: bookingId,
                      landlord_id: llId,
                      student_id: 'st1',
                      property_id: 'pr1',
                      status: 'bond_pending',
                      service_tier_final: 'listing',
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: async () => ({
                    data: [{ id: bookingId, status: 'cancelled' }],
                    error: null,
                  }),
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

    const result = await runCancelListingBookingLandlord({
      stripe: stripeOk(),
      admin: admin as never,
      landlordProfileId: llId,
      bookingId,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(mocks.sendListingCancelledByLandlordEmails).toHaveBeenCalled()
  })
})
