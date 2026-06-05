import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { type LeaseDocState } from '../../lib/leaseState'

/**
 * Phase 3 / Task J - shared "lease document" panel for renter and landlord booking
 * detail surfaces. Single fetch against /api/documents/lease-state, renders the
 * appropriate CTA per derived state:
 *
 *   preview          → "View lease preview (draft)" view-only link
 *   ready_to_sign    → "Sign your tenancy agreement" prominent CTA (DocuSeal embed)
 *   awaiting_other   → "Awaiting <counterparty> signature" status; viewer's signed copy
 *                      is not yet available for download until both parties have signed
 *   fully_signed     → "Download signed agreement"
 *   none             → nothing rendered
 *
 * The panel polls the endpoint on mount and exposes a `refreshKey` re-fetch trigger so
 * parents can call refresh after server-side state changes (e.g. after the landlord ticks
 * "Bond received from renter").
 */

type LeaseStateApiResult = {
  state: LeaseDocState
  viewer_role: 'landlord' | 'tenant'
  viewer_signed: boolean
  counterparty_signed: boolean
  co_tenant_signing_required?: boolean
  co_tenant_signed?: boolean
  preview_url?: string
  signing_url?: string
  signed_url?: string
  signed_url_rta?: string
  signed_url_addendum?: string
}

export type BookingLeasePanelProps = {
  bookingId: string
  /** Caller-controlled key - change to trigger refetch (e.g. after mark-bond-received). */
  refreshKey?: number
  /** Listing bond_pending: show prepare/retry when accept-time generation failed. */
  allowPrepareRetry?: boolean
  /** Listing landlord: reset DocuSeal round and regenerate PDF when draft/signing is wrong. */
  allowRegenerateAgreement?: boolean
  className?: string
}

function counterpartyLabel(viewer: 'landlord' | 'tenant'): string {
  return viewer === 'landlord' ? 'renter' : 'host'
}

export default function BookingLeasePanel({
  bookingId,
  refreshKey,
  allowPrepareRetry = false,
  allowRegenerateAgreement = false,
  className,
}: BookingLeasePanelProps) {
  const [data, setData] = useState<LeaseStateApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepareBusy, setPrepareBusy] = useState(false)
  const [prepareError, setPrepareError] = useState<string | null>(null)
  const [regenerateBusy, setRegenerateBusy] = useState(false)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const autoPrepareAttempted = useRef(false)

  const fetchState = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setError('Sign in to view your tenancy agreement.')
        return
      }
      const res = await fetch(apiUrl('/api/documents/lease-state'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const j = (await res.json()) as LeaseStateApiResult & { error?: string }
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not load tenancy agreement state.')
        return
      }
      setData(j)
    } catch {
      setError('Could not load tenancy agreement state.')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void fetchState()
  }, [fetchState, refreshKey])

  const prepareAgreement = useCallback(async () => {
    if (!bookingId || !allowPrepareRetry) return
    setPrepareBusy(true)
    setPrepareError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setPrepareError('Sign in to prepare the tenancy agreement.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-prepare-listing-agreement'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      })
      const j = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok) {
        setPrepareError(typeof j.error === 'string' ? j.error : 'Could not prepare tenancy agreement.')
        return
      }
      await fetchState()
    } catch {
      setPrepareError('Could not prepare tenancy agreement.')
    } finally {
      setPrepareBusy(false)
    }
  }, [allowPrepareRetry, bookingId, fetchState])

  const regenerateAgreement = useCallback(async () => {
    if (!bookingId || !allowRegenerateAgreement) return
    const confirmed = window.confirm(
      'Regenerate the tenancy agreement?\n\nThis creates a new PDF and new DocuSeal signing links. Any previous signing links (including emails already sent) will no longer apply. Only use this if the current agreement is wrong or was generated before a fix.\n\nContinue?',
    )
    if (!confirmed) return

    setRegenerateBusy(true)
    setRegenerateError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setRegenerateError('Sign in to regenerate the tenancy agreement.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-regenerate-listing-agreement'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      })
      const j = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok) {
        setRegenerateError(
          typeof j.error === 'string' ? j.error : 'Could not regenerate tenancy agreement.',
        )
        return
      }
      await fetchState()
    } catch {
      setRegenerateError('Could not regenerate tenancy agreement.')
    } finally {
      setRegenerateBusy(false)
    }
  }, [allowRegenerateAgreement, bookingId, fetchState])

  const showRegenerateControl =
    allowRegenerateAgreement &&
    data?.viewer_role === 'landlord' &&
    data.state !== 'none' &&
    data.state !== 'fully_signed'

  const regenerateButton = showRegenerateControl ? (
    <div className="pt-2 border-t border-indigo-200/80 space-y-2">
      <p className="text-xs text-indigo-900/80 leading-relaxed">
        Wrong or blank agreement? Regenerate to issue a new PDF and signing links. Tell renters to use the new
        links only.
      </p>
      {regenerateError && <p className="text-xs text-red-800">{regenerateError}</p>}
      <button
        type="button"
        disabled={regenerateBusy || prepareBusy}
        onClick={() => void regenerateAgreement()}
        className="inline-flex items-center rounded-lg border border-amber-300 bg-white text-sm font-semibold text-amber-950 px-4 py-2 hover:bg-amber-50 disabled:opacity-60"
      >
        {regenerateBusy ? 'Regenerating…' : 'Regenerate agreement'}
      </button>
    </div>
  ) : null

  useEffect(() => {
    if (!allowPrepareRetry || loading || prepareBusy || autoPrepareAttempted.current) return
    if (data?.state !== 'none') return
    autoPrepareAttempted.current = true
    void prepareAgreement()
  }, [allowPrepareRetry, data?.state, loading, prepareBusy, prepareAgreement])

  if (loading && !data) {
    return (
      <div
        className={`rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 ${className ?? ''}`.trim()}
      >
        Loading tenancy agreement…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className ?? ''}`.trim()}
        role="status"
      >
        {error}
      </div>
    )
  }

  if (!data || data.state === 'none') {
    if (!allowPrepareRetry) return null
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-3 ${className ?? ''}`.trim()}
        role="status"
      >
        <p className="font-semibold leading-snug">Tenancy agreement</p>
        <p className="text-xs leading-relaxed">
          {prepareBusy
            ? 'Preparing your agreement and signing links…'
            : 'Your agreement is not ready yet. Use the button below to generate it now, or check your email for DocuSeal.'}
        </p>
        {prepareError && <p className="text-xs text-red-800">{prepareError}</p>}
        <button
          type="button"
          disabled={prepareBusy}
          onClick={() => void prepareAgreement()}
          className="inline-flex items-center rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
        >
          {prepareBusy ? 'Preparing…' : 'Prepare tenancy agreement'}
        </button>
      </div>
    )
  }

  const {
    state,
    viewer_role,
    co_tenant_signing_required,
    co_tenant_signed,
    preview_url,
    signing_url,
    signed_url,
    signed_url_rta,
    signed_url_addendum,
  } = data

  const signingPartyNote = co_tenant_signing_required
    ? 'The host, you, and your co-tenant must each sign before the agreement is binding.'
    : 'Both parties must sign before the agreement becomes binding.'

  return (
    <div
      className={`rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-950 space-y-3 ${className ?? ''}`.trim()}
    >
      {state === 'preview' && (
        <>
          <p className="font-semibold leading-snug">Lease preview (draft)</p>
          <p className="text-xs leading-relaxed text-indigo-900/90">
            Your residential tenancy agreement has been drafted.{' '}
            {viewer_role === 'tenant'
              ? 'Check your email for DocuSeal signing, or use the button below when ready. Bond payment is separate - see bond guidance on your dashboard.'
              : 'Check your email for DocuSeal signing, or use the button below. Record bond receipt on Quni when the renter has paid (this does not block signing).'}
          </p>
          {preview_url && (
            <a
              href={preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-indigo-300 bg-white text-sm font-semibold text-indigo-700 px-4 py-2 hover:bg-indigo-50"
            >
              View draft agreement
            </a>
          )}
        </>
      )}

      {state === 'ready_to_sign' && (
        <>
          <p className="font-semibold leading-snug">Sign your tenancy agreement</p>
          <p className="text-xs leading-relaxed text-indigo-900/90">
            Your tenancy agreement is ready to sign. {signingPartyNote}
          </p>
          {signing_url ? (
            <a
              href={signing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700"
            >
              Open signing page
            </a>
          ) : (
            <p className="text-xs text-amber-900">
              Signing link is not yet available in-app. Check the email we sent you with your DocuSeal signing link.
            </p>
          )}
          {preview_url && (
            <a
              href={preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 px-3 py-1.5 hover:bg-indigo-50"
            >
              View draft
            </a>
          )}
        </>
      )}

      {state === 'awaiting_other' && (
        <>
          <p className="font-semibold leading-snug">
            {co_tenant_signing_required && !co_tenant_signed && viewer_role === 'landlord'
              ? 'Awaiting renter and co-tenant signatures'
              : co_tenant_signing_required && !co_tenant_signed && viewer_role === 'tenant'
                ? 'Awaiting host and co-tenant signatures'
                : `Awaiting ${counterpartyLabel(viewer_role)} signature`}
          </p>
          <p className="text-xs leading-relaxed text-indigo-900/90">
            You&apos;ve signed your tenancy agreement.{' '}
            {co_tenant_signing_required && !co_tenant_signed
              ? 'The signed PDF will appear here once your host and co-tenant have also signed (your co-tenant receives a separate signing link by email).'
              : `The signed PDF will appear here once the ${counterpartyLabel(viewer_role)} has also signed.`}
          </p>
          {preview_url && (
            <a
              href={preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 px-3 py-1.5 hover:bg-indigo-50"
            >
              View draft
            </a>
          )}
        </>
      )}

      {state === 'fully_signed' && (
        <>
          <p className="font-semibold leading-snug">Tenancy agreement signed</p>
          <p className="text-xs leading-relaxed text-indigo-900/90">
            Your residential tenancy agreement is fully executed
            {co_tenant_signing_required ? ' by all parties' : ' by both parties'}.
          </p>
          {signed_url_rta && signed_url_addendum ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={signed_url_rta}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700"
              >
                Download tenancy agreement
              </a>
              <a
                href={signed_url_addendum}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-indigo-300 bg-white text-sm font-semibold text-indigo-700 px-4 py-2 hover:bg-indigo-50"
              >
                Download Quni platform addendum
              </a>
            </div>
          ) : signed_url ? (
            <a
              href={signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700"
            >
              Download signed agreement
            </a>
          ) : null}
        </>
      )}

      {regenerateButton}
    </div>
  )
}
