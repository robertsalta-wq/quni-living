import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.fn()
const captureSentryMessageEdge = vi.fn()
const recordBookingEvent = vi.fn()

vi.mock('../sendEmail.js', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

vi.mock('../sentryEdgeCapture.js', () => ({
  captureSentryMessageEdge: (...args: unknown[]) => captureSentryMessageEdge(...args),
}))

vi.mock('./events/recordBookingEvent.js', () => ({
  recordBookingEvent: (...args: unknown[]) => recordBookingEvent(...args),
}))

describe('sendBookingEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not send when email.attempt insert fails', async () => {
    const { sendBookingEmail } = await import('./sendBookingEmail.js')
    recordBookingEvent.mockRejectedValueOnce(new Error('attempt blocked'))

    await expect(
      sendBookingEmail({} as never, {
        bookingId: 'book-1',
        templateKey: 'listing_payment_instructions',
        to: 'renter@example.com',
        subject: 'Pay',
        html: '<p>x</p>',
      }),
    ).rejects.toThrow(/attempt blocked/)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('logs accepted after Resend success', async () => {
    const { sendBookingEmail } = await import('./sendBookingEmail.js')
    recordBookingEvent.mockResolvedValue({ ok: true, id: 'e1' })
    sendEmail.mockResolvedValue({ id: 're_123' })

    const result = await sendBookingEmail({} as never, {
      bookingId: 'book-1',
      templateKey: 'listing_payment_instructions',
      to: 'renter@example.com',
      subject: 'Pay',
      html: '<p>x</p>',
    })

    expect(result.resendId).toBe('re_123')
    expect(recordBookingEvent).toHaveBeenCalledTimes(2)
    expect(recordBookingEvent.mock.calls[0][1].eventType).toBe('email.attempt')
    expect(recordBookingEvent.mock.calls[1][1].eventType).toBe('email.accepted')
    expect(recordBookingEvent.mock.calls[1][1].providerRef).toBe('re_123')
    expect(sendEmail.mock.calls[0][0].tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'booking_id', value: 'book-1' }),
        expect.objectContaining({ name: 'template_key', value: 'listing_payment_instructions' }),
      ]),
    )
  })

  it('does not retry send when accepted insert fails', async () => {
    const { sendBookingEmail } = await import('./sendBookingEmail.js')
    recordBookingEvent
      .mockResolvedValueOnce({ ok: true, id: 'e1' })
      .mockRejectedValueOnce(new Error('accepted insert failed'))
    sendEmail.mockResolvedValue({ id: 're_123' })

    const result = await sendBookingEmail({} as never, {
      bookingId: 'book-1',
      templateKey: 'listing_payment_instructions',
      to: 'renter@example.com',
      subject: 'Pay',
      html: '<p>x</p>',
    })

    expect(result.resendId).toBe('re_123')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(captureSentryMessageEdge).toHaveBeenCalled()
  })

  it('writes email.failed when Resend throws', async () => {
    const { sendBookingEmail } = await import('./sendBookingEmail.js')
    recordBookingEvent.mockResolvedValue({ ok: true, id: 'e1' })
    sendEmail.mockRejectedValue(new Error('Resend down'))

    await expect(
      sendBookingEmail({} as never, {
        bookingId: 'book-1',
        templateKey: 'listing_payment_instructions',
        to: 'renter@example.com',
        subject: 'Pay',
        html: '<p>x</p>',
      }),
    ).rejects.toThrow(/Resend down/)

    expect(recordBookingEvent.mock.calls.map((c) => c[1].eventType)).toEqual([
      'email.attempt',
      'email.failed',
    ])
  })
})
