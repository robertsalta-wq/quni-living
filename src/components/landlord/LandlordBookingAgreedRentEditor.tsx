import { useCallback, useMemo, useState } from 'react'
import { apiUrl } from '../../lib/apiUrl'
import { DEFAULT_BOND_WEEKS, MAX_BOND_WEEKS, parseBondWeeks, resolveListingBondAud } from '../../lib/booking/resolveBookingBondAmount'
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
  propertyBondWeeks?: number | null
  serviceTierAtRequest: string | null | undefined
  onSaved: () => void
  /** Strip outer card chrome when hosted in the terms rail modal. */
  embedded?: boolean
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
  propertyBondWeeks,
  serviceTierAtRequest,
  onSaved,
  embedded = false,
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
  const [bondOverrideEnabled, setBondOverrideEnabled] = useState(false)
  const [bondOverrideWeeks, setBondOverrideWeeks] = useState(String(DEFAULT_BOND_WEEKS))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)

  const previewBondAud = useMemo(() => {
    const rent = Number(agreedRent)
    if (!Number.isFinite(rent) || rent <= 0) {
      return bondAmount != null ? Number(bondAmount) : null
    }
    if (bondOverrideEnabled) {
      const weeks = parseBondWeeks(bondOverrideWeeks)
      if (weeks == null) return null
      return resolveListingBondAud({ bond_weeks: weeks }, rent)
    }
    if (bondAmount != null) return Number(bondAmount)
    return resolveListingBondAud({ bond_weeks: propertyBondWeeks }, rent)
  }, [agreedRent, bondAmount, bondOverrideEnabled, bondOverrideWeeks, propertyBondWeeks])

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

    let bondOverride: { enabled: boolean; weeks: number | null } | undefined
    if (bondOverrideEnabled) {
      const weeks = parseBondWeeks(bondOverrideWeeks)
      if (weeks == null) {
        setError(`Enter bond weeks from 0 to ${MAX_BOND_WEEKS}.`)
        return
      }
      bondOverride = { enabled: true, weeks }
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
          ...(bondOverride ? { bondOverride } : {}),
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
  }, [agreedRent, applyCap, bondOverrideEnabled, bondOverrideWeeks, bookingId, onSaved, reason])

  if (!editable && !prov.overrideApplied) return null

  return (
    <section
      className={
        embedded
          ? 'space-y-4'
          : 'rounded-admin-lg border border-admin-line-soft bg-white p-5 shadow-sm space-y-4'
      }
    >
      {embedded ? null : (
        <div>
          <h2 className="text-sm font-semibold text-admin-ink">
            Agreed weekly rent
          </h2>
          <p className="mt-1 text-sm text-admin-ink-4 leading-relaxed">
            Set a lower agreed rent before you accept. The student will see this figure before signing. Listing price
            stays unchanged.
          </p>
        </div>
      )}

      {prov.overrideApplied ? (
        <BookingAgreedRentNotice
          weeklyRent={weeklyRent}
          rentBreakdown={rentBreakdown}
          bondAmount={bondAmount}
          audience="landlord"
          embedded={embedded}
        />
      ) : null}

      {editable ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="agreed-rent" className="block text-xs font-semibold text-admin-ink-4 uppercase tracking-wide">
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
                className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2 text-sm tabular-nums"
              />
              {applyCap != null ? (
                <p className="mt-1 text-xs text-admin-ink-5">Max {formatAudWeekly(applyCap)}/wk (student&apos;s apply-time rent)</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="agreed-rent-bond" className="block text-xs font-semibold text-admin-ink-4 uppercase tracking-wide">
                Bond (preview)
              </label>
              <p id="agreed-rent-bond" className="mt-2 text-sm text-admin-ink-2 tabular-nums">
                {previewBondAud != null ? formatAudWeekly(previewBondAud) : 'No bond'}
              </p>
              <p className="mt-1 text-xs text-admin-ink-5">Updates when you save a new agreed rent or bond override.</p>
            </div>
          </div>

          <div className="rounded-admin-md border border-admin-line bg-admin-surface-2 p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bondOverrideEnabled}
                onChange={(e) => setBondOverrideEnabled(e.target.checked)}
                className="mt-1 rounded border-admin-line"
              />
              <span>
                <span className="block text-sm font-semibold text-admin-ink">Override bond for this booking</span>
                <span className="block text-xs text-admin-ink-4 mt-0.5 leading-relaxed">
                  Optional. Otherwise bond follows the listing default (or invite offer) and scales with agreed rent.
                </span>
              </span>
            </label>
            {bondOverrideEnabled ? (
              <div className="pl-7">
                <label htmlFor="agreed-rent-bond-weeks" className="block text-xs font-semibold text-admin-ink-4 uppercase tracking-wide">
                  Bond (weeks of rent)
                </label>
                <input
                  id="agreed-rent-bond-weeks"
                  type="number"
                  min={0}
                  max={MAX_BOND_WEEKS}
                  step={1}
                  value={bondOverrideWeeks}
                  onChange={(e) => setBondOverrideWeeks(e.target.value)}
                  placeholder="Weeks of rent"
                  className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2 text-sm tabular-nums"
                />
                <p className="mt-1 text-xs text-admin-ink-5">Enter 0 for no bond.</p>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="agreed-rent-reason" className="block text-xs font-semibold text-admin-ink-4 uppercase tracking-wide">
              Reason
            </label>
            <textarea
              id="agreed-rent-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Longer lease, includes utilities discussion"
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2 text-sm"
            />
          </div>
          {error ? (
            <p className="text-sm text-admin-danger-fg" role="alert">
              {error}
            </p>
          ) : null}
          {savedToast ? (
            <p className="text-sm text-admin-success-fg" role="status">
              {savedToast}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSubmit()}
            className="rounded-admin-md bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : prov.overrideApplied ? 'Update agreed rent' : 'Set agreed rent'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
