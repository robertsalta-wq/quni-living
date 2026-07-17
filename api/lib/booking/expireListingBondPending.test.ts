import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchListingFeePaymentIntentId: vi.fn(),
  refundListingFeePaymentIntentFull: vi.fn(),
  sendListingBondPendingExpiredEmails: vi.fn(),
}))

vi.mock('./listingFeePaymentIntent.js', () => ({
  fetchListingFeePaymentIntentId: mocks.fetchListingFeePaymentIntentId,
  refundListingFeePaymentIntentFull: mocks.refundListingFeePaymentIntentFull,
}))

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingBondPendingExpiredEmails: mocks.sendListingBondPendingExpiredEmails,
}))

vi.mock('./unwindListingAgreement.js', () => ({
  runUnwindListingAgreementCleanup: vi.fn().mockResolvedValue(undefined),
}))

import { runExpireListingBondPendingBooking } from './expireListingBondPending.js'

const bookingId = '00000000-0000-4000-8000-000000000002'
const nowIso = '2026-06-09T12:00:00.000Z'

const bookingRow = {
  id: bookingId,
  landlord_id: 'll1',
  student_id: 'st1',
  property_id: 'pr1',
}

function stripeOk() {
  return {} as never
}

describe('runExpireListingBondPendingBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendListingBondPendingExpiredEmails.mockResolvedValue(undefined)
  })

  it('fee-exempt (no PI): expires without refund, event + emails', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue(null)

    let eventInsert: Record<string, unknown> | null = null
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenancies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            update: () => ({
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            }),
          }
        }
        if (table === 'booking_events') {
          return {
            insert: (row: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  eventInsert = row
                  return { data: { id: 'evt-1' }, error: null }
                },
              }),
            }),
          }
        }
        return {}
      }),
    }

    const result = await runExpireListingBondPendingBooking({
      stripe: stripeOk(),
      admin: admin as never,
      booking: bookingRow,
      nowIso,
    })

    expect(result).toEqual({ ok: true, expired: true })
    expect(mocks.refundListingFeePaymentIntentFull).not.toHaveBeenCalled()
    expect(mocks.sendListingBondPendingExpiredEmails).toHaveBeenCalledTimes(1)
    expect(mocks.sendListingBondPendingExpiredEmails).toHaveBeenCalledWith(
      admin,
      bookingRow,
      { refund_id: null, refund_amount_cents: null },
    )
    expect(eventInsert).toMatchObject({
      event_type: 'bond.pending_expired',
      booking_id: bookingId,
    })
    expect(eventInsert?.metadata).toMatchObject({
      reason: 'bond_window_elapsed',
      fee_exempt: true,
    })
    expect(eventInsert?.metadata).not.toHaveProperty('stripe_payment_intent_id')
    expect(eventInsert?.metadata).not.toHaveProperty('refund_id')
  })

  it('paid path: refund before expire, event includes PI metadata', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')
    mocks.refundListingFeePaymentIntentFull.mockResolvedValue({
      refundId: 're_456',
      refundAmountCents: 9900,
    })

    let eventInsert: Record<string, unknown> | null = null
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenancies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            update: () => ({
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            }),
          }
        }
        if (table === 'booking_events') {
          return {
            insert: (row: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  eventInsert = row
                  return { data: { id: 'evt-1' }, error: null }
                },
              }),
            }),
          }
        }
        return {}
      }),
    }

    const result = await runExpireListingBondPendingBooking({
      stripe: stripeOk(),
      admin: admin as never,
      booking: bookingRow,
      nowIso,
    })

    expect(result).toEqual({ ok: true, expired: true })
    expect(mocks.refundListingFeePaymentIntentFull).toHaveBeenCalled()
    expect(eventInsert?.metadata).toMatchObject({
      reason: 'bond_window_elapsed',
      refund_id: 're_456',
      refund_amount_cents: 9900,
      stripe_payment_intent_id: 'pi_fee',
    })
    expect(eventInsert?.metadata).not.toHaveProperty('fee_exempt')
  })

  it('refund failure: retry on next cron run', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')
    mocks.refundListingFeePaymentIntentFull.mockRejectedValue(new Error('stripe down'))

    const updates: string[] = []
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenancies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            update: () => {
              updates.push('bookings')
              return { eq: () => ({ eq: async () => ({ error: null }) }) }
            },
          }
        }
        return {}
      }),
    }

    const result = await runExpireListingBondPendingBooking({
      stripe: stripeOk(),
      admin: admin as never,
      booking: bookingRow,
      nowIso,
    })

    expect(result).toEqual({ ok: false, retry: true })
    // Guard reads (tenancies) are allowed; no booking mutation before the refund clears.
    expect(updates).not.toContain('bookings')
    expect(mocks.sendListingBondPendingExpiredEmails).not.toHaveBeenCalled()
  })

  it('blocks expiry when the lease is already fully signed (no refund, no email)', async () => {
    mocks.fetchListingFeePaymentIntentId.mockResolvedValue('pi_fee')

    let eventInsert: Record<string, unknown> | null = null
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'tenancies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'ten-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'tenancy_documents') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'doc-1',
                        status: 'signed',
                        landlord_signed_at: '2026-06-26T09:58:51.253Z',
                        student_signed_at: '2026-06-27T02:09:29.563Z',
                        co_tenant_signed_at: null,
                        docuseal_submission_id: '133',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'booking_events') {
          return {
            insert: (row: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  eventInsert = row
                  return { data: { id: 'evt-block' }, error: null }
                },
              }),
            }),
          }
        }
        return {}
      }),
    }

    const result = await runExpireListingBondPendingBooking({
      stripe: stripeOk(),
      admin: admin as never,
      booking: bookingRow,
      nowIso,
    })

    expect(result).toEqual({ ok: true, expired: false, blocked: 'signed_lease' })
    expect(mocks.fetchListingFeePaymentIntentId).not.toHaveBeenCalled()
    expect(mocks.refundListingFeePaymentIntentFull).not.toHaveBeenCalled()
    expect(mocks.sendListingBondPendingExpiredEmails).not.toHaveBeenCalled()
    expect(eventInsert).toMatchObject({
      event_type: 'bond.expiry_blocked_signed_lease',
      booking_id: bookingId,
      actor_type: 'cron',
      outcome: 'n/a',
      provider: 'docuseal',
      provider_ref: '133',
    })
  })
})
