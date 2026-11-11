import { useCallback, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
  isStripeTestPublishableKey,
} from '../../lib/stripePublic'
import PaymentsSecuredByStripe from '../PaymentsSecuredByStripe'

type PayResponse = {
  error?: string
  alreadyPaid?: boolean
  processing?: boolean
  clientSecret?: string
  paymentIntentId?: string
  paymentIntentStatus?: string
}

type Prepared =
  | { kind: 'action'; clientSecret: string }
  | { kind: 'form'; clientSecret: string }
  | { kind: 'processing' }

async function postLeaseFeePay(body: Record<string, unknown>): Promise<PayResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('You need to be signed in.')
  const res = await fetch(apiUrl('/api/landlord-lease-charge-pay'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  let payload: PayResponse = {}
  try {
    payload = raw ? (JSON.parse(raw) as PayResponse) : {}
  } catch {
    throw new Error(raw.trim().slice(0, 200) || `Request failed (${res.status})`)
  }
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`)
  return payload
}

export async function completeLeaseFeePayment(args: {
  bookingId: string
  chargeId: string
  paymentIntentId: string
}): Promise<void> {
  const payload = await postLeaseFeePay(args)
  if (!payload.alreadyPaid && payload.error) throw new Error(payload.error)
}

function returnUrlFor(chargeId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('leaseCharge', chargeId)
  url.hash = 'lease-fee'
  return url.toString()
}

function PayForm({
  bookingId,
  chargeId,
  onPaid,
}: {
  bookingId: string
  chargeId: string
  onPaid: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = useCallback(async () => {
    if (!stripe || !elements || !ready) return
    setBusy(true)
    setLocalError(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrlFor(chargeId) },
      redirect: 'if_required',
    })
    if (error) {
      setLocalError(error.message || 'The bank did not confirm this card.')
      setBusy(false)
      return
    }
    if (paymentIntent?.status === 'succeeded' && paymentIntent.id) {
      try {
        await completeLeaseFeePayment({ bookingId, chargeId, paymentIntentId: paymentIntent.id })
        onPaid()
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'The payment could not be confirmed.')
        setBusy(false)
      }
      return
    }
    if (paymentIntent?.status === 'processing') {
      setLocalError('Your bank is still processing this payment.')
      setBusy(false)
      return
    }
    setLocalError('The payment has not completed yet.')
    setBusy(false)
  }, [bookingId, chargeId, elements, onPaid, ready, stripe])

  return (
    <div className="space-y-3">
      <PaymentElement onReady={() => setReady(true)} />
      {localError ? <p className="text-sm text-red-700">{localError}</p> : null}
      <button
        type="button"
        disabled={!stripe || !ready || busy}
        onClick={() => void submit()}
        className="rounded-full bg-admin-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Paying…' : 'Pay now'}
      </button>
    </div>
  )
}

export default function LandlordLeaseFeePay({
  bookingId,
  chargeId,
  amountLabel,
  onClose,
  onPaid,
}: {
  bookingId: string
  chargeId: string
  amountLabel: string
  onClose: () => void
  onPaid: () => void
}) {
  const [stripeJs, setStripeJs] = useState<Stripe | null>(null)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const publishableKey = getStripePublishableKey()
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  )

  const load = useCallback(
    async (replaceCard: boolean) => {
      setLoading(true)
      setError(null)
      setPrepared(null)
      try {
        const payload = await postLeaseFeePay({ bookingId, chargeId, replaceCard })
        if (payload.alreadyPaid) {
          onPaid()
          return
        }
        if (payload.processing) {
          setPrepared({ kind: 'processing' })
          return
        }
        if (!payload.clientSecret) throw new Error('No payment was started.')
        setPrepared(
          payload.paymentIntentStatus === 'requires_action'
            ? { kind: 'action', clientSecret: payload.clientSecret }
            : { kind: 'form', clientSecret: payload.clientSecret },
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start the payment.')
      } finally {
        setLoading(false)
      }
    },
    [bookingId, chargeId, onPaid],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    let cancelled = false
    void stripePromise?.then((stripe) => {
      if (!cancelled) setStripeJs(stripe)
    })
    return () => {
      cancelled = true
    }
  }, [stripePromise])

  async function confirmSavedCard(clientSecret: string) {
    if (!stripeJs) return
    setBusy(true)
    setError(null)
    const { error: stripeErr, paymentIntent } = await stripeJs.confirmCardPayment(clientSecret, {
      return_url: returnUrlFor(chargeId),
    })
    if (stripeErr) {
      setError(stripeErr.message || 'The bank did not confirm this card.')
      setBusy(false)
      return
    }
    if (paymentIntent?.status === 'succeeded' && paymentIntent.id) {
      try {
        await completeLeaseFeePayment({ bookingId, chargeId, paymentIntentId: paymentIntent.id })
        onPaid()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The payment could not be confirmed.')
        setBusy(false)
      }
      return
    }
    setError('The payment has not completed yet.')
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="quni-modal relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pay the Quni lease fee</h3>
            <p className="mt-1 text-sm text-gray-600">
              {amountLabel} incl. GST. This is only the Quni lease fee. The lease is still signed and valid. Rent is
              paid to you, not to Quni.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>

        {!isStripePublishableKeyConfigured() || !stripePromise ? (
          <p className="text-sm text-red-700">Card payments are not configured in this build.</p>
        ) : loading || !prepared || (prepared.kind === 'form' && !stripeJs) ? (
          error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : (
            <p className="py-8 text-sm text-gray-600">Preparing secure form…</p>
          )
        ) : (
          <div className="space-y-3">
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {prepared.kind === 'processing' ? (
              <p className="text-sm text-gray-700">Your bank is still processing this payment.</p>
            ) : prepared.kind === 'action' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Your bank needs to confirm the saved card. You can use a different card instead.</p>
                <button
                  type="button"
                  disabled={busy || !stripeJs}
                  onClick={() => void confirmSavedCard(prepared.clientSecret)}
                  className="rounded-full bg-admin-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Confirming…' : 'Confirm card'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void load(true)}
                  className="block text-sm font-semibold text-admin-coral underline"
                >
                  Use a different card
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {isStripeTestPublishableKey() ? (
                  <p className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Test mode:</span> Use card 4242 4242 4242 4242, any
                    future expiry, any CVC.
                  </p>
                ) : null}
                <PaymentsSecuredByStripe align="start" className="max-w-md" />
                <Elements
                  key={prepared.clientSecret}
                  stripe={stripeJs}
                  options={{
                    clientSecret: prepared.clientSecret,
                    appearance: { theme: 'stripe', variables: { colorPrimary: '#FF6F61' } },
                  }}
                >
                  <PayForm bookingId={bookingId} chargeId={chargeId} onPaid={onPaid} />
                </Elements>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
