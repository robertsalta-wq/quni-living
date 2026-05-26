import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { type LeaseDocState } from '../../lib/leaseState'

/**
 * Phase 3 / Task J — shared "lease document" panel for renter and landlord booking
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
  /** Caller-controlled key — change to trigger refetch (e.g. after mark-bond-received). */
  refreshKey?: number
  className?: string
}

function counterpartyLabel(viewer: 'landlord' | 'tenant'): string {
  return viewer === 'landlord' ? 'renter' : 'host'
}

export default function BookingLeasePanel({ bookingId, refreshKey, className }: BookingLeasePanelProps) {
  const [data, setData] = useState<LeaseStateApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (!data || data.state === 'none') return null

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
            Your residential tenancy agreement has been drafted. {viewer_role === 'tenant' ? 'Pay your bond directly to your host first — they will confirm receipt and the lease will unlock for signing.' : 'Confirm bond received from the renter to unlock the lease for signing.'}
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
    </div>
  )
}
