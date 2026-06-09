import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../sendEmail.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../emailTemplates.js', () => ({
  bookingAutoDeclinedPropertyTakenStudent: vi.fn(() => ({ subject: 'taken', html: '<p>taken</p>' })),
  propertyAddressLine: vi.fn(() => '1 Test St'),
}))

vi.mock('../sentryEdgeCapture.js', () => ({
  captureSentryMessageEdge: vi.fn().mockResolvedValue(undefined),
}))

import { sendEmail } from '../sendEmail.js'
import { declineCompetingBookings } from './declineCompetingBookings.js'

describe('declineCompetingBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declines listing competitors without Stripe calls', async () => {
    const stripe = { paymentIntents: { retrieve: vi.fn() }, refunds: { create: vi.fn() } }
    const updates: unknown[] = []

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { title: 'Unit 1', address: '1 St', suburb: 'Sydney', state: 'NSW', postcode: '2000' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            select: () => ({
              eq: () => ({
                neq: () => ({
                  in: async () => ({
                    data: [
                      {
                        id: 'comp1',
                        stripe_payment_intent_id: null,
                        service_tier_at_request: 'listing',
                        student_profiles: { email: 'b@example.com', full_name: 'Backup Student' },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
            update: (patch: unknown) => ({
              eq: async () => {
                updates.push(patch)
                return { error: null }
              },
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    const result = await declineCompetingBookings(admin as never, stripe as never, {
      propertyId: 'pr1',
      winningBookingId: 'win1',
      siteBase: 'https://example.com',
    })

    expect(result.declined).toBe(1)
    expect(updates[0]).toMatchObject({ status: 'declined', decline_reason: 'property_taken' })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalled()
  })
})
