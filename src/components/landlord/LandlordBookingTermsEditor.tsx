import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../../lib/apiUrl'
import { DEFAULT_BOND_WEEKS, MAX_BOND_WEEKS, parseBondWeeks, resolveListingBondAud } from '../../lib/booking/resolveBookingBondAmount'
import type { CoTenantSnapshot } from '../../lib/pricing/bookingOccupancySnapshot'
import { applyWeeklyRentFromBreakdown } from '../../lib/pricing/applyWeeklyRentFromBreakdown'
import { formatAudWeekly } from '../../lib/pricing/rentAgreedOverride'
import { supabase } from '../../lib/supabase'

const LEASE_LENGTH_OPTIONS = ['3 months', '6 months', '12 months', '2 years', 'Flexible'] as const

export type LandlordBookingTermsEditorProps = {
  bookingId: string
  status: string
  serviceTierAtRequest: string | null | undefined
  serviceTierFinal: string | null | undefined
  weeklyRent: number | null | undefined
  bondAmount: number | null | undefined
  rentBreakdown: unknown
  propertyBondWeeks?: number | null
  moveInDate: string | null | undefined
  startDate: string | null | undefined
  leaseLength: string | null | undefined
  occupantCount: number | null | undefined
  notes: string | null | undefined
  coTenant: CoTenantSnapshot | null
  onSaved: () => void
}

type LeaseStateGate = {
  any_party_signed?: boolean
  state?: string
  error?: string
}

async function readJsonApiResponse(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text()
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }
}

export function listingBookingTermsEditorEligible(
  status: string,
  serviceTierAtRequest: string | null | undefined,
  serviceTierFinal: string | null | undefined,
): boolean {
  const allowed = status === 'pending_confirmation' || status === 'awaiting_info' || status === 'bond_pending'
  if (!allowed) return false
  if (serviceTierAtRequest === 'listing') return true
  return status === 'bond_pending' && serviceTierFinal === 'listing'
}

function isoDateInputValue(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  const s = raw.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

export default function LandlordBookingTermsEditor({
  bookingId,
  status,
  serviceTierAtRequest,
  serviceTierFinal,
  weeklyRent,
  bondAmount,
  rentBreakdown,
  propertyBondWeeks,
  moveInDate,
  startDate,
  leaseLength,
  occupantCount,
  notes,
  coTenant,
  onSaved,
}: LandlordBookingTermsEditorProps) {
  const eligible = listingBookingTermsEditorEligible(status, serviceTierAtRequest, serviceTierFinal)

  const applyCap = useMemo(
    () => applyWeeklyRentFromBreakdown(rentBreakdown, weeklyRent),
    [rentBreakdown, weeklyRent],
  )

  const initialMoveIn = isoDateInputValue(moveInDate ?? startDate)
  const initialLease = typeof leaseLength === 'string' && leaseLength.trim() ? leaseLength.trim() : '6 months'
  const initialOcc = Math.max(1, Math.floor(Number(occupantCount)) || 1)

  const [weeklyRentInput, setWeeklyRentInput] = useState(
    () => (weeklyRent != null ? String(weeklyRent) : ''),
  )
  const [bondOverrideEnabled, setBondOverrideEnabled] = useState(false)
  const [bondOverrideWeeks, setBondOverrideWeeks] = useState(String(DEFAULT_BOND_WEEKS))
  const [leaseLengthInput, setLeaseLengthInput] = useState(initialLease)
  const [moveInInput, setMoveInInput] = useState(initialMoveIn)
  const [occupantCountInput, setOccupantCountInput] = useState(String(initialOcc))
  const [notesInput, setNotesInput] = useState(typeof notes === 'string' ? notes : '')
  const [hasCoTenant, setHasCoTenant] = useState(Boolean(coTenant) || initialOcc >= 2)
  const [coName, setCoName] = useState(coTenant?.full_name ?? '')
  const [coEmail, setCoEmail] = useState(coTenant?.email ?? '')
  const [coPhone, setCoPhone] = useState(coTenant?.phone ?? '')
  const [coDob, setCoDob] = useState(coTenant?.date_of_birth ?? '')
  const [reason, setReason] = useState('')

  const [leaseGate, setLeaseGate] = useState<LeaseStateGate | null>(null)
  const [leaseGateLoading, setLeaseGateLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [coTenantUnverifiedWarning, setCoTenantUnverifiedWarning] = useState(false)

  const fetchLeaseGate = useCallback(async () => {
    if (!bookingId || !eligible) return
    setLeaseGateLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setLeaseGate({ error: 'sign_in_required' })
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
      const j = (await res.json()) as LeaseStateGate
      if (!res.ok) {
        setLeaseGate({ error: typeof j.error === 'string' ? j.error : 'lease_state_failed' })
        return
      }
      setLeaseGate(j)
    } catch {
      setLeaseGate({ error: 'lease_state_failed' })
    } finally {
      setLeaseGateLoading(false)
    }
  }, [bookingId, eligible])

  useEffect(() => {
    void fetchLeaseGate()
  }, [fetchLeaseGate])

  const previewBondAud = useMemo(() => {
    const rent = Number(weeklyRentInput)
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
  }, [bondAmount, bondOverrideEnabled, bondOverrideWeeks, propertyBondWeeks, weeklyRentInput])

  const signingBlocked =
    leaseGate?.any_party_signed === true || leaseGate?.state === 'fully_signed'

  const onSubmit = useCallback(async () => {
    setError(null)
    setSavedNotice(null)
    setCoTenantUnverifiedWarning(false)

    const trimmedReason = reason.trim()
    if (trimmedReason.length < 3) {
      setError('Add a reason for this change (at least 3 characters).')
      return
    }

    const parsedRent = Number(weeklyRentInput)
    if (!Number.isFinite(parsedRent) || parsedRent <= 0) {
      setError('Enter a positive weekly rent in AUD.')
      return
    }
    if (applyCap != null && parsedRent > applyCap) {
      setError(`Weekly rent cannot exceed ${formatAudWeekly(applyCap)}/wk (what the student applied at).`)
      return
    }

    const occ = Math.floor(Number(occupantCountInput))
    if (!Number.isFinite(occ) || occ < 1 || occ > 10) {
      setError('Occupant count must be between 1 and 10.')
      return
    }

    if (!moveInInput || !/^\d{4}-\d{2}-\d{2}$/.test(moveInInput)) {
      setError('Enter a valid move-in date.')
      return
    }

    if (!LEASE_LENGTH_OPTIONS.includes(leaseLengthInput as (typeof LEASE_LENGTH_OPTIONS)[number])) {
      setError('Select a valid lease length.')
      return
    }

    /** Partial patch sent to booking-update-terms. */
    const patch: Record<string, unknown> = {}

    if (weeklyRent != null ? parsedRent !== Number(weeklyRent) : true) {
      patch.weekly_rent = parsedRent
    } else if (weeklyRent == null && parsedRent > 0) {
      patch.weekly_rent = parsedRent
    }

    if (bondOverrideEnabled) {
      const weeks = parseBondWeeks(bondOverrideWeeks)
      if (weeks == null) {
        setError(`Enter bond weeks from 0 to ${MAX_BOND_WEEKS}.`)
        return
      }
      patch.bondOverride = { enabled: true, weeks }
    }

    if (leaseLengthInput !== (leaseLength?.trim() || initialLease)) {
      patch.lease_length = leaseLengthInput
    }

    if (moveInInput !== initialMoveIn) {
      patch.move_in_date = moveInInput
    }

    const notesNorm = notesInput.trim()
    const prevNotes = typeof notes === 'string' ? notes.trim() : ''
    if (notesNorm !== prevNotes) {
      patch.notes = notesNorm.length > 0 ? notesNorm : null
    }

    if (occ !== initialOcc) {
      patch.occupant_count = occ
    }

    const hadCoTenant = coTenant != null
    if (!hasCoTenant && (hadCoTenant || occ >= 2)) {
      patch.co_tenant = null
    } else if (hasCoTenant) {
      if (coName.trim().length < 2) {
        setError('Co-tenant full name is required (at least 2 characters).')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coEmail.trim())) {
        setError('Co-tenant email must be valid.')
        return
      }
      if (coPhone.trim().length < 6) {
        setError('Co-tenant phone is required.')
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(coDob.trim())) {
        setError('Co-tenant date of birth must be YYYY-MM-DD.')
        return
      }
      const nextCo = {
        full_name: coName.trim(),
        email: coEmail.trim(),
        phone: coPhone.trim(),
        date_of_birth: coDob.trim().slice(0, 10),
      }
      const prevJson = JSON.stringify(coTenant ?? null)
      const nextJson = JSON.stringify(nextCo)
      if (prevJson !== nextJson) {
        patch.co_tenant = nextCo
      }
    }

    if (Object.keys(patch).length === 0) {
      setError('Change at least one field before saving.')
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

      const res = await fetch(apiUrl('/api/booking-update-terms'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          patch,
          reason: trimmedReason,
        }),
      })

      const body = await readJsonApiResponse(res)
      if (!res.ok) {
        const messages = body.messages
        if (Array.isArray(messages) && messages.length > 0) {
          setError(messages.map(String).join(' '))
        } else {
          setError(
            typeof body.message === 'string'
              ? body.message
              : typeof body.error === 'string'
                ? body.error
                : 'Could not save booking terms.',
          )
        }
        return
      }

      setReason('')
      setCoTenantUnverifiedWarning(body.co_tenant_unverified === true)
      setSavedNotice(
        'Terms updated — click Regenerate agreement to reissue the PDF and signing links to all parties. The previous draft is now void.',
      )
      await fetchLeaseGate()
      onSaved()
    } catch {
      setError('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }, [
    applyCap,
    bondOverrideEnabled,
    bondOverrideWeeks,
    bookingId,
    coDob,
    coEmail,
    coName,
    coPhone,
    coTenant,
    fetchLeaseGate,
    hasCoTenant,
    initialLease,
    initialMoveIn,
    initialOcc,
    leaseLength,
    leaseLengthInput,
    moveInInput,
    notes,
    notesInput,
    occupantCountInput,
    onSaved,
    reason,
    weeklyRent,
    weeklyRentInput,
  ])

  if (!eligible) return null

  if (leaseGateLoading && !leaseGate) {
    return (
      <section className="rounded-admin-lg border border-admin-line bg-admin-surface-1 p-6 shadow-admin-card text-sm text-admin-ink-5">
        Loading booking terms editor…
      </section>
    )
  }

  if (signingBlocked) return null

  return (
    <section className="rounded-admin-lg border border-admin-line bg-admin-surface-1 p-6 shadow-admin-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-admin-ink">Edit booking terms</h2>
        <p className="mt-1 text-sm text-admin-ink-3 leading-relaxed">
          Update rent, bond, lease length, move-in date, occupants, special conditions, or co-tenant details before
          anyone signs. Save here first, then regenerate the agreement to reissue the PDF and signing links.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="terms-weekly-rent" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
            Weekly rent (AUD / week)
          </label>
          <input
            id="terms-weekly-rent"
            type="number"
            min={0.01}
            step={0.01}
            max={applyCap ?? undefined}
            value={weeklyRentInput}
            onChange={(e) => setWeeklyRentInput(e.target.value)}
            className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm tabular-nums"
          />
          {applyCap != null ? (
            <p className="mt-1 text-xs text-admin-ink-5">Max {formatAudWeekly(applyCap)}/wk (student&apos;s apply-time rent)</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="terms-bond-preview" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
            Bond (preview)
          </label>
          <p id="terms-bond-preview" className="mt-2 text-sm font-semibold text-admin-ink tabular-nums">
            {previewBondAud != null ? formatAudWeekly(previewBondAud) : 'No bond'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-admin-line bg-admin-surface-2/80 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={bondOverrideEnabled}
            onChange={(e) => setBondOverrideEnabled(e.target.checked)}
            className="mt-1 rounded border-admin-line"
          />
          <span>
            <span className="block text-sm font-semibold text-admin-ink">Override bond for this booking</span>
            <span className="block text-xs text-admin-ink-3 mt-0.5">Optional. Uses weeks of rent when enabled.</span>
          </span>
        </label>
        {bondOverrideEnabled ? (
          <div className="pl-7">
            <label htmlFor="terms-bond-weeks" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
              Bond (weeks of rent)
            </label>
            <input
              id="terms-bond-weeks"
              type="number"
              min={0}
              max={MAX_BOND_WEEKS}
              step={1}
              value={bondOverrideWeeks}
              onChange={(e) => setBondOverrideWeeks(e.target.value)}
              className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm tabular-nums"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="terms-lease-length" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
            Lease length
          </label>
          <select
            id="terms-lease-length"
            value={leaseLengthInput}
            onChange={(e) => setLeaseLengthInput(e.target.value)}
            className="mt-1 w-full rounded-xl border border-admin-line bg-white px-3 py-2 text-sm"
          >
            {LEASE_LENGTH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="terms-move-in" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
            Move-in date
          </label>
          <input
            id="terms-move-in"
            type="date"
            value={moveInInput}
            onChange={(e) => setMoveInInput(e.target.value)}
            className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="terms-occupants" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
          Occupant count
        </label>
        <input
          id="terms-occupants"
          type="number"
          min={1}
          max={10}
          step={1}
          value={occupantCountInput}
          onChange={(e) => setOccupantCountInput(e.target.value)}
          className="mt-1 w-full max-w-[8rem] rounded-xl border border-admin-line px-3 py-2 text-sm tabular-nums"
        />
      </div>

      <div>
        <label htmlFor="terms-notes" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
          Special conditions / notes
        </label>
        <textarea
          id="terms-notes"
          rows={3}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Printed on the agreement when saved and regenerated"
          className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-admin-line bg-admin-surface-2/50 p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasCoTenant}
            onChange={(e) => {
              setHasCoTenant(e.target.checked)
              if (!e.target.checked) {
                setOccupantCountInput('1')
                setCoName('')
                setCoEmail('')
                setCoPhone('')
                setCoDob('')
              }
            }}
            className="rounded border-admin-line"
          />
          <span className="text-sm font-semibold text-admin-ink">Include a co-tenant on this booking</span>
        </label>
        {hasCoTenant ? (
          <div className="grid gap-3 sm:grid-cols-2 pl-0 sm:pl-7">
            <div className="sm:col-span-2">
              <label htmlFor="terms-co-name" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
                Co-tenant full name
              </label>
              <input
                id="terms-co-name"
                type="text"
                value={coName}
                onChange={(e) => setCoName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="terms-co-email" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
                Email
              </label>
              <input
                id="terms-co-email"
                type="email"
                value={coEmail}
                onChange={(e) => setCoEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="terms-co-phone" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
                Phone
              </label>
              <input
                id="terms-co-phone"
                type="tel"
                value={coPhone}
                onChange={(e) => setCoPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="terms-co-dob" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
                Date of birth
              </label>
              <input
                id="terms-co-dob"
                type="date"
                value={coDob}
                onChange={(e) => setCoDob(e.target.value)}
                className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="terms-reason" className="block text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
          Reason for change
        </label>
        <textarea
          id="terms-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required — e.g. Agreed longer lease with renter"
          className="mt-1 w-full rounded-xl border border-admin-line px-3 py-2 text-sm"
        />
      </div>

      {coTenantUnverifiedWarning ? (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2" role="status">
          The co-tenant&apos;s identity has not been verified on Quni. They can still sign; identity checks are handled
          separately.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {savedNotice ? (
        <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2" role="status">
          {savedNotice}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void onSubmit()}
        className="rounded-xl bg-admin-ink text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save booking terms'}
      </button>
    </section>
  )
}
