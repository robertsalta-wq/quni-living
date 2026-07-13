import { describe, expect, it, vi } from 'vitest'
import { recordBookingEvent } from './recordBookingEvent.js'
import { defaultsForEventType, resolveAudience } from './types.js'

function mockAdmin(insertResult: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(insertResult)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const from = vi.fn(() => ({ insert }))
  return { admin: { from } as never, from, insert, select, single }
}

describe('booking event defaults', () => {
  it('forces email events to internal audience', () => {
    expect(resolveAudience('email.attempt', 'both')).toBe('internal')
    expect(resolveAudience('email.bounced', 'both')).toBe('internal')
    expect(resolveAudience('email.accepted', undefined)).toBe('internal')
  })

  it('uses registry defaults for known types', () => {
    expect(defaultsForEventType('document.fully_signed')).toEqual({
      audience: 'both',
      outcome: 'success',
    })
    expect(defaultsForEventType('booking.status_changed').audience).toBe('both')
  })

  it('falls back to internal/n/a for unknown types', () => {
    expect(defaultsForEventType('custom.unknown')).toEqual({
      audience: 'internal',
      outcome: 'n/a',
    })
  })
})

describe('recordBookingEvent device context', () => {
  it('merges user_agent and is_mobile into metadata', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'evt-d' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ insert }))
    const admin = { from } as never

    await recordBookingEvent(admin, {
      bookingId: 'book-1',
      eventType: 'booking.confirmed',
      metadata: { template_key: 'x' },
      deviceCtx: { user_agent: 'Mozilla/5.0 iPhone', is_mobile: true },
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          template_key: 'x',
          user_agent: 'Mozilla/5.0 iPhone',
          is_mobile: true,
        },
      }),
    )
  })
})

describe('recordBookingEvent', () => {
  it('inserts into booking_events with defaults', async () => {
    const { admin, from, insert } = mockAdmin({
      data: { id: 'evt-1' },
      error: null,
    })

    const result = await recordBookingEvent(admin, {
      bookingId: 'book-1',
      eventType: 'document.signature_recorded',
      actorType: 'webhook',
      actorLabel: 'DocuSeal',
      provider: 'docuseal',
      providerRef: '165',
    })

    expect(result).toEqual({ ok: true, id: 'evt-1' })
    expect(from).toHaveBeenCalledWith('booking_events')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: 'book-1',
        event_type: 'document.signature_recorded',
        audience: 'both',
        outcome: 'success',
        actor_type: 'webhook',
        actor_label: 'DocuSeal',
        provider: 'docuseal',
        provider_ref: '165',
      }),
    )
  })

  it('forces email audience to internal even when both requested', async () => {
    const { admin, insert } = mockAdmin({
      data: { id: 'evt-2' },
      error: null,
    })

    await recordBookingEvent(admin, {
      bookingId: 'book-1',
      eventType: 'email.accepted',
      audience: 'both',
      provider: 'resend',
      providerRef: 're_123',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'email.accepted',
        audience: 'internal',
        outcome: 'success',
      }),
    )
  })

  it('returns ok false when not required and insert fails', async () => {
    const { admin } = mockAdmin({
      data: null,
      error: { message: 'db down' },
    })

    const result = await recordBookingEvent(admin, {
      bookingId: 'book-1',
      eventType: 'booking.status_changed',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('db down')
    }
  })

  it('throws when required and insert fails', async () => {
    const { admin } = mockAdmin({
      data: null,
      error: { message: 'db down' },
    })

    await expect(
      recordBookingEvent(
        admin,
        { bookingId: 'book-1', eventType: 'email.attempt' },
        { required: true },
      ),
    ).rejects.toThrow(/db down/)
  })

  it('rejects empty booking id without writing', async () => {
    const { admin, from } = mockAdmin({ data: null, error: null })

    const result = await recordBookingEvent(admin, {
      bookingId: '  ',
      eventType: 'booking.created',
    })

    expect(result.ok).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })
})
