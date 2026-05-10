import { describe, expect, it, vi } from 'vitest'
import { confirmLandlordBookingWithOptionalThreeDS } from './landlordBookingConfirm'

describe('confirmLandlordBookingWithOptionalThreeDS', () => {
  it('returns ok on first 200', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    })

    const result = await confirmLandlordBookingWithOptionalThreeDS('booking-1', 'tok', {
      fetch: fetch as unknown as typeof globalThis.fetch,
      loadStripeFn: vi.fn() as never,
      getPublishableKey: () => 'pk_test_x',
    })

    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('402 + client_secret runs confirmCardPayment then re-POSTs', async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      error: null,
      paymentIntent: { status: 'succeeded', id: 'pi_x' },
    })

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        text: async () =>
          JSON.stringify({
            error: 'requires_action',
            client_secret: 'cs_test_secret',
            payment_intent_id: 'pi_123',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, branch: 'listing' }),
      })

    const loadStripeFn = vi.fn().mockResolvedValue({
      confirmCardPayment,
    })

    const result = await confirmLandlordBookingWithOptionalThreeDS('bid', 'tok', {
      fetch: fetch as unknown as typeof globalThis.fetch,
      loadStripeFn: loadStripeFn as never,
      getPublishableKey: () => 'pk_test_x',
    })

    expect(result).toEqual({ ok: true })
    expect(confirmCardPayment).toHaveBeenCalledWith('cs_test_secret')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('402 flow reports progress stages', async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      error: null,
      paymentIntent: { status: 'succeeded', id: 'pi_x' },
    })

    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        text: async () =>
          JSON.stringify({
            error: 'requires_action',
            client_secret: 'cs_test_secret',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{}',
      })

    const onProgress = vi.fn()

    await confirmLandlordBookingWithOptionalThreeDS(
      'bid',
      'tok',
      {
        fetch: fetch as unknown as typeof globalThis.fetch,
        loadStripeFn: vi.fn().mockResolvedValue({ confirmCardPayment }) as never,
        getPublishableKey: () => 'pk_test_x',
      },
      { onProgress },
    )

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { stage: 'request' },
      { stage: 'payment_auth' },
      { stage: 'retry' },
      { stage: 'request' },
    ])
  })

  it('402: Stripe error surfaces without second POST when confirm fails', async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      error: { message: 'Your card was declined.' },
      paymentIntent: null,
    })

    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () =>
        JSON.stringify({
          client_secret: 'cs_test_secret',
        }),
    })

    const result = await confirmLandlordBookingWithOptionalThreeDS('bid', 'tok', {
      fetch: fetch as unknown as typeof globalThis.fetch,
      loadStripeFn: vi.fn().mockResolvedValue({ confirmCardPayment }) as never,
      getPublishableKey: () => 'pk_test_x',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('declined')
    }
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
