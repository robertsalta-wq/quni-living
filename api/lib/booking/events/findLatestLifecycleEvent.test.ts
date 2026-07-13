import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findLatestLifecycleEvent,
  stripePaymentIntentIdFromMetadata,
} from './findLatestLifecycleEvent.js'

describe('findLatestLifecycleEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers booking_events over STE', async () => {
    const admin = {
      from: (table: string) => {
        if (table === 'booking_events') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          created_at: '2026-07-13T12:00:00.000Z',
                          metadata: { stripe_payment_intent_id: 'pi_new' },
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected ${table}`)
      },
    }

    const result = await findLatestLifecycleEvent(admin as never, {
      bookingId: 'book-1',
      bookingEventType: 'booking.confirmed',
      steEventType: 'booking_confirmed',
    })

    expect(result).toMatchObject({
      found: true,
      source: 'booking_events',
      createdAt: '2026-07-13T12:00:00.000Z',
    })
    expect(stripePaymentIntentIdFromMetadata(result.metadata)).toBe('pi_new')
  })

  it('falls back to STE when booking_events has no row', async () => {
    const admin = {
      from: (table: string) => {
        if (table === 'booking_events') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'service_tier_events') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: {
                          created_at: '2026-06-01T00:00:00.000Z',
                          metadata: { refund_id: 're_1' },
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected ${table}`)
      },
    }

    const result = await findLatestLifecycleEvent(admin as never, {
      bookingId: 'book-1',
      bookingEventType: 'bond.pending_expired',
      steEventType: 'bond_pending_expired',
    })

    expect(result).toMatchObject({
      found: true,
      source: 'service_tier_events',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: { refund_id: 're_1' },
    })
  })
})
