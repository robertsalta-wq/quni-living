import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordBookingEvent = vi.fn()

vi.mock('./recordBookingEvent.js', () => ({
  recordBookingEvent: (...args: unknown[]) => recordBookingEvent(...args),
}))

describe('handleResendEmailOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recordBookingEvent.mockResolvedValue({ ok: true, id: 'evt-new' })
  })

  it('ignores unknown event types', async () => {
    const { handleResendEmailOutcome } = await import('./handleResendEmailOutcome.js')
    const admin = { from: vi.fn() } as never
    const result = await handleResendEmailOutcome(admin, { type: 'email.clicked' })
    expect(result).toEqual({ handled: false, reason: 'ignored_type:email.clicked' })
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('appends email.delivered when accepted row exists', async () => {
    const { handleResendEmailOutcome } = await import('./handleResendEmailOutcome.js')

    const maybeSingleAccepted = vi.fn().mockResolvedValue({
      data: {
        id: 'acc-1',
        booking_id: 'book-1',
        landlord_id: 'll-1',
        student_id: 'st-1',
        correlation_id: 'corr-1',
        metadata: {},
      },
      error: null,
    })
    const maybeSingleDup = vi.fn().mockResolvedValue({ data: null, error: null })

    let selectPass = 0
    const admin = {
      from: vi.fn(() => ({
        select: () => {
          selectPass += 1
          if (selectPass === 1) {
            return {
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({ maybeSingle: maybeSingleAccepted }),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({ maybeSingle: maybeSingleDup }),
                }),
              }),
            }),
          }
        },
      })),
    } as never

    const result = await handleResendEmailOutcome(admin, {
      type: 'email.delivered',
      created_at: '2026-07-12T09:02:00.000Z',
      data: { email_id: 're_123', subject: 'Pay' },
    })

    expect(result).toEqual({ handled: true, bookingId: 'book-1' })
    expect(recordBookingEvent).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        bookingId: 'book-1',
        eventType: 'email.delivered',
        provider: 'resend',
        providerRef: 're_123',
        correlationId: 'corr-1',
        actorType: 'webhook',
      }),
      { required: true },
    )
  })

  it('returns no_booking_match when email id is unknown', async () => {
    const { handleResendEmailOutcome } = await import('./handleResendEmailOutcome.js')
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
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
        }),
      })),
    } as never

    const result = await handleResendEmailOutcome(admin, {
      type: 'email.bounced',
      data: { email_id: 're_missing' },
    })

    expect(result).toEqual({ handled: false, reason: 'no_booking_match', bookingId: undefined })
    expect(recordBookingEvent).not.toHaveBeenCalled()
  })
})
