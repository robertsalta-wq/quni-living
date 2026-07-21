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

function paymentElementLoadErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const e = (payload as { error?: { message?: string } }).error
    if (e && typeof e.message === 'string' && e.message.trim()) return e.message.trim()
  }
  return 'Payment form could not load. Check that your Stripe publishable key matches the same account and mode (test/live) as the server secret key.'
}

function ListingSetupPaymentInner({
  onSucceeded,
  onFatalError,
}: {
  onSucceeded: () => void
  onFatalError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [elementReady, setElementReady] = useState(false)
  const [elementBroken, setElementBroken] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = useCallback(async () => {
    if (!stripe || !elements) return
    if (!elementReady || elementBroken) return
    setLocalError(null)
    setBusy(true)
    try {
      const { error: submitErr } = await elements.submit()
      if (submitErr) {
        setLocalError(submitErr.message ?? 'Check your card details.')
        return
      }

      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      })

      if (error) {
        setLocalError(error.message ?? 'Could not save card.')
        return
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.id) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setLocalError('Session expired. Please refresh and try again.')
          return
        }

        const completeRes = await fetch(apiUrl('/api/landlord-stripe-setup-complete'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        })
        const raw = await completeRes.text()
        let body: { ok?: boolean; error?: string } = {}
        try {
          body = raw ? (JSON.parse(raw) as typeof body) : {}
        } catch {
          setLocalError('Invalid response from server.')
          return
        }
        if (!completeRes.ok) {
          setLocalError(body.error ?? 'Could not save card on your account.')
          return
        }
        onSucceeded()
        return
      }

      setLocalError('Setup did not finish. Please try again.')
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not save card.')
    } finally {
      setBusy(false)
    }
  }, [stripe, elements, elementReady, elementBroken, onSucceeded])

  const disabled = busy || !stripe || !elementReady || elementBroken

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => {
          setElementReady(true)
          setElementBroken(false)
        }}
        onLoadError={(e) => {
          setElementReady(false)
          setElementBroken(true)
          console.warn('[landlord listing] PaymentElement load error', paymentElementLoadErrorMessage(e))
          onFatalError(paymentElementLoadErrorMessage(e))
        }}
      />
      {localError && (
        <p className="text-sm text-red-600" role="alert">
          {localError}
        </p>
      )}
      {!elementBroken && stripe && !elementReady && (
        <p className="text-sm text-gray-500">Loading secure payment form…</p>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={disabled}
        className="w-full rounded-xl bg-[var(--quni-coral)] text-white py-3 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save card'}
      </button>
    </div>
  )
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LandlordListingPaymentModal({ open, onClose, onSuccess }: Props) {
  const publishable = useMemo(() => getStripePublishableKey(), [])
  const stripePromise = useMemo(
    () => (publishable ? loadStripe(publishable) : null),
    [publishable],
  )
  const [stripeJs, setStripeJs] = useState<Stripe | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [loadingSetup, setLoadingSetup] = useState(false)

  useEffect(() => {
    if (!stripePromise) {
      setStripeJs(null)
      return
    }
    let cancelled = false
    void stripePromise.then((s) => {
      if (!cancelled) setStripeJs(s)
    })
    return () => {
      cancelled = true
    }
  }, [stripePromise])

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      setInitError(null)
      return
    }

    let cancelled = false
    async function run() {
      setLoadingSetup(true)
      setInitError(null)
      setClientSecret(null)
      try {
        const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
        if (sessErr) throw sessErr
        const token = sessionData.session?.access_token
        if (!token) {
          setInitError('You need to be signed in.')
          return
        }
        const res = await fetch(apiUrl('/api/landlord-stripe-payment-setup'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        const raw = await res.text()
        let body: { clientSecret?: string; error?: string } = {}
        try {
          body = raw ? (JSON.parse(raw) as typeof body) : {}
        } catch {
          setInitError(raw.trim().slice(0, 200) || `Request failed (${res.status})`)
          return
        }
        if (!res.ok) {
          setInitError(body.error ?? `Request failed (${res.status})`)
          return
        }
        if (!body.clientSecret) {
          setInitError('No client secret returned.')
          return
        }
        if (!cancelled) setClientSecret(body.clientSecret)
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : 'Could not start card setup.')
      } finally {
        if (!cancelled) setLoadingSetup(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSucceeded = useCallback(() => {
    onSuccess()
    onClose()
  }, [onSuccess, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => !loadingSetup && onClose()}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Save a payment method</h3>
            <p className="text-sm text-gray-600 mt-1">
              Used for Quni Listing booking fees when you accept a booking. You won&apos;t be charged until then.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            disabled={loadingSetup}
            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isStripePublishableKeyConfigured() || !stripePromise ? (
          <p className="text-sm text-red-700">
            Card payments are not configured in this build (missing VITE_STRIPE_PUBLISHABLE_KEY).
          </p>
        ) : initError ? (
          <p className="text-sm text-red-700" role="alert">
            {initError}
          </p>
        ) : loadingSetup || !clientSecret || !stripeJs ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-10 w-10 border-2 border-[var(--quni-coral)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Preparing secure form…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {isStripeTestPublishableKey() && (
              <div
                role="note"
                className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-xs text-slate-600 leading-snug"
              >
                <span className="font-semibold text-slate-700">Test mode:</span> Use card 4242 4242 4242 4242, any
                future expiry, any CVC.
              </div>
            )}
            <PaymentsSecuredByStripe align="start" className="max-w-md" />
            <Elements
              key={clientSecret}
              stripe={stripeJs}
              options={{
                clientSecret,
                appearance: { theme: 'stripe', variables: { colorPrimary: '#FF6F61' } },
              }}
            >
              <ListingSetupPaymentInner
                onSucceeded={handleSucceeded}
                onFatalError={(msg) => setInitError(msg)}
              />
            </Elements>
          </div>
        )}
      </div>
    </div>
  )
}
