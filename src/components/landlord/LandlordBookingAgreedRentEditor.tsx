import { useCallback, useMemo, useState } from 'react'
import { apiUrl } from '../../lib/apiUrl'
import { supabase } from '../../lib/supabase'
import {
  formatAudWeekly,
  parseRentOverrideProvenance,
} from '../../lib/pricing/rentAgreedOverride'
import { applyWeeklyRentFromBreakdown } from '../../lib/pricing/applyWeeklyRentFromBreakdown'
import BookingAgreedRentNotice from '../booking/BookingAgreedRentNotice'

type Props = {
  bookingId: string
  status: string
  weeklyRent: number | null | undefined
  bondAmount: number | null | undefined
  rentBreakdown: unknown
  propertyBond: number | null | undefined
  serviceTierAtRequest: string | null | undefined
  onSaved: () => void
}

async function readJsonApiResponse(res: Response): Promise<{ error?: string; message?: string } & Record<string, unknown>> {
  const raw = await res.text()
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as { error?: string; message?: string } & Record<string, unknown>
  } catch {
    return { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }
}

export default function LandlordBookingAgreedRentEditor({
  bookingId,
  status,
  weeklyRent,
  bondAmount,
  rentBreakdown,
  propertyBond,
  serviceTierAtRequest,
  onSaved,
}: Props) {
  const prov = parseRentOverrideProvenance(rentBreakdown)
  const applyCap = useMemo(
    () => applyWeeklyRentFromBreakdown(rentBreakdown, weeklyRent),
    [rentBreakdown, weeklyRent],
  )

  const editable =
    serviceTierAtRequest === 'listing' &&
    (status === 'pending_confirmation' || status === 'awaiting_info')

  const [agreedRent, setAgreedRent] = useState(
    () => (weeklyRent != null ? String(weeklyRent) : prov.agreedWeeklyRentAud != null ? String(prov.agreedWeeklyRentAud) : ''),
  )
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)

  const onSubmit = useCallback(async () => {
    setError(null)
    setSavedToast(null)
    const parsed = Number(agreedRent)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a positive weekly rent in AUD.')
      return
    }
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 3) {
      setError('Add a short reason (at least 3 characters).')
      return
    }
    if (applyCap != null && parsed > applyCap) {
      setError(`Agreed rent cannot exceed ${formatAudWeekly(applyCap)}/wk (what the student applied at).`)
      return
    }

    setBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setError('Session expired — sign in again.')
        return
      }

      const res = await fetch(apiUrl('/api/booking-set-agreed-rent'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          agreedWeeklyRent: parsed,
          reason: trimmedReason,
        }),
      })

      const body = await readJsonApiResponse(res)
      if (!res.ok) {
        setError(typeof body.message === 'string' ? body.message : body.error || 'Could not save agreed rent.')
        return
      }

      setReason('')
      setSavedToast('Agreed rent saved.')
      onSaved()
    } catch {
      setError('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }, [agreedRent, applyCap, bookingId, onSaved, reason])

  if (!editable && !prov.overrideApplied) return null

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2
          className="text-sm font-semibold text-gray-900"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Agreed weekly rent
        </h2>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          Set a lower agreed rent before you accept. The student will see this figure before signing. Listing price
          stays unchanged.
        </p>
      </div>

      {prov.overrideApplied ? (
        <BookingAgreedRentNotice
          weeklyRent={weeklyRent}
          rentBreakdown={rentBreakdown}
          bondAmount={bondAmount}
          audience="landlord"
        />
      ) : null}

      {editable ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="agreed-rent" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Agreed rent (AUD / week)
              </label>
              <input
                id="agreed-rent"
                type="number"
                min={0.01}
                step={0.01}
                max={applyCap ?? undefined}
                value={agreedRent}
                onChange={(e) => setAgreedRent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm tabular-nums"
              />
              {applyCap != null ? (
                <p className="mt-1 text-xs text-gray-500">Max {formatAudWeekly(applyCap)}/wk (student&apos;s apply-time rent)</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="agreed-rent-bond" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Bond (scales with rent)
              </label>
              <p id="agreed-rent-bond" className="mt-2 text-sm text-gray-800 tabular-nums">
                {bondAmount != null
                  ? formatAudWeekly(Number(bondAmount))
                  : propertyBond != null
                    ? formatAudWeekly(Number(propertyBond))
                    : '-'}
              </p>
              <p className="mt-1 text-xs text-gray-500">Recomputed when you save a new agreed rent.</p>
            </div>
          </div>
          <div>
            <label htmlFor="agreed-rent-reason" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Reason
            </label>
            <textarea
              id="agreed-rent-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Longer lease, includes utilities discussion"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          {savedToast ? (
            <p className="text-sm text-emerald-800" role="status">
              {savedToast}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSubmit()}
            className="rounded-xl bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : prov.overrideApplied ? 'Update agreed rent' : 'Set agreed rent'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
