import { loadStripe } from '@stripe/stripe-js'
import { apiUrl } from './apiUrl'
import { getStripePublishableKey } from './stripePublic'

async function readJsonApiResponse(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  const raw = await res.text()
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as { error?: string } & Record<string, unknown>
  } catch {
    return { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }
}

export type ConfirmBookingDeps = {
  fetch: typeof fetch
  loadStripeFn: typeof loadStripe
  getPublishableKey: typeof getStripePublishableKey
}

/** Progress hints for long-running confirm (Listing fee + optional card authentication). */
export type ConfirmBookingProgress =
  | { stage: 'request' }
  | { stage: 'payment_auth' }
  | { stage: 'retry' }

export type ConfirmBookingOptions = {
  serviceTier?: 'listing' | 'managed'
  onProgress?: (p: ConfirmBookingProgress) => void
}

const defaultDeps: ConfirmBookingDeps = {
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  loadStripeFn: loadStripe,
  getPublishableKey: getStripePublishableKey,
}

/**
 * POST /api/confirm-booking; if 402 + client_secret, run 3DS then re-POST once.
 */
export async function confirmLandlordBookingWithOptionalThreeDS(
  bookingId: string,
  accessToken: string,
  deps: Partial<ConfirmBookingDeps> = {},
  opts?: ConfirmBookingOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { fetch: fetchFn, loadStripeFn, getPublishableKey } = { ...defaultDeps, ...deps }

  async function postOnce(): Promise<Response> {
    opts?.onProgress?.({ stage: 'request' })
    return fetchFn(apiUrl('/api/confirm-booking'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        bookingId,
        ...(opts?.serviceTier ? { serviceTier: opts.serviceTier } : {}),
      }),
    })
  }

  let res = await postOnce()
  let body = await readJsonApiResponse(res)

  if (res.ok) {
    return { ok: true }
  }

  const clientSecret =
    typeof body.client_secret === 'string' && body.client_secret.trim()
      ? body.client_secret.trim()
      : typeof body.clientSecret === 'string' && body.clientSecret.trim()
        ? body.clientSecret.trim()
        : ''

  if (res.status === 402 && clientSecret) {
    opts?.onProgress?.({ stage: 'payment_auth' })
    const pk = getPublishableKey()
    if (!pk) {
      return {
        ok: false,
        error:
          'Payments need a Stripe publishable key in this environment (VITE_STRIPE_PUBLISHABLE_KEY).',
      }
    }

    const stripe = await loadStripeFn(pk)
    if (!stripe) {
      return { ok: false, error: 'Could not load Stripe.js.' }
    }

    const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret)

    if (stripeErr) {
      return {
        ok: false,
        error: stripeErr.message?.trim() || 'Authentication failed or was cancelled.',
      }
    }

    if (paymentIntent?.status !== 'succeeded' && paymentIntent?.status !== 'requires_capture') {
      const st = paymentIntent?.status ?? 'unknown'
      return {
        ok: false,
        error: `Payment did not complete (status: ${st}).`,
      }
    }

    opts?.onProgress?.({ stage: 'retry' })
    res = await postOnce()
    body = await readJsonApiResponse(res)

    if (res.ok) {
      return { ok: true }
    }

    const msg =
      (typeof body.message === 'string' && body.message.trim()) ||
      (typeof body.error === 'string' && body.error) ||
      'Could not confirm booking after authentication.'
    return { ok: false, error: msg }
  }

  const msg =
    (typeof body.message === 'string' && body.message.trim()) ||
    (typeof body.error === 'string' && body.error) ||
    'Could not confirm booking.'
  return { ok: false, error: msg }
}
