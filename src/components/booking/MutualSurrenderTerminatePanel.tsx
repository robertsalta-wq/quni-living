import { useState } from 'react'
import { apiUrl } from '../../lib/apiUrl'
import { supabase } from '../../lib/supabase'

type BondOutcome =
  | 'pending'
  | 'transferred'
  | 'refunded'
  | 'retained_by_agreement'
  | 'never_lodged'
  | 'na'

const BOND_OPTIONS: { value: BondOutcome; label: string }[] = [
  { value: 'never_lodged', label: 'Never lodged with RBO' },
  { value: 'transferred', label: 'Transfer / carry to new tenancy (RBO)' },
  { value: 'refunded', label: 'Refund to tenant (RBO)' },
  { value: 'retained_by_agreement', label: 'Retained by agreement' },
  { value: 'pending', label: 'Pending (record later)' },
]

type Props = {
  bookingId: string
  status: string
  serviceTierFinal: string | null
  terminationEffectiveDate?: string | null
  terminationAcknowledgedAt?: string | null
  terminationReasonNote?: string | null
  bondOutcome?: string | null
  bondOutcomeNote?: string | null
  onUpdated: () => void
}

export function MutualSurrenderTerminatePanel({
  bookingId,
  status,
  serviceTierFinal,
  terminationEffectiveDate,
  terminationAcknowledgedAt,
  terminationReasonNote,
  bondOutcome,
  bondOutcomeNote,
  onUpdated,
}: Props) {
  const [effectiveDate, setEffectiveDate] = useState('')
  const [reasonNote, setReasonNote] = useState('')
  const [bond, setBond] = useState<BondOutcome>(
    (bondOutcome as BondOutcome | null | undefined) &&
      BOND_OPTIONS.some((o) => o.value === bondOutcome)
      ? (bondOutcome as BondOutcome)
      : 'never_lodged',
  )
  const [bondNote, setBondNote] = useState(bondOutcomeNote ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const canInitiate =
    serviceTierFinal === 'listing' && (status === 'confirmed' || status === 'active')
  const isTerminating = status === 'terminating'
  const isTerminated = status === 'terminated'
  const reasonTrimmed = reasonNote.trim()
  const canSubmit = Boolean(effectiveDate && reasonTrimmed.length >= 3)

  if (serviceTierFinal !== 'listing') return null
  if (!canInitiate && !isTerminating && !isTerminated) return null

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not signed in')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  async function onInitiate() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(apiUrl('/api/booking-terminate-mutual-surrender'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId,
          terminationEffectiveDate: effectiveDate,
          reasonNote: reasonTrimmed,
          bondOutcome: bond,
          bondOutcomeNote: bondNote.trim() || null,
          continueInSamePremises: true,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Could not start mutual surrender')
        return
      }
      setOkMsg(
        'Mutual surrender started. Both parties must e-sign the acknowledgment. The room stays reserved until the effective date.',
      )
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveBondOutcome() {
    setBusy(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(apiUrl('/api/booking-record-bond-outcome'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId,
          bondOutcome: bond,
          bondOutcomeNote: bondNote.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Could not save bond outcome')
        return
      }
      setOkMsg('Bond outcome recorded (external action still required in RBO if applicable).')
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (isTerminated) {
    return (
      <section className="mt-6 border-t border-admin-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
          Agreement ended
        </p>
        <p className="mt-1 text-sm text-admin-ink-2">
          Terminated
          {terminationEffectiveDate ? ` effective ${terminationEffectiveDate}` : ''}. Bond outcome:{' '}
          {bondOutcome || 'not recorded'}.
        </p>
        {terminationReasonNote ? (
          <p className="mt-1 text-sm text-admin-ink-3">Reason: {terminationReasonNote}</p>
        ) : null}
        {bondOutcomeNote ? (
          <p className="mt-1 text-sm text-admin-ink-3">Bond note: {bondOutcomeNote}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-admin-ink-2">
            Update bond outcome
            <select
              className="mt-1 block rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bond}
              onChange={(e) => setBond(e.target.value as BondOutcome)}
            >
              {BOND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-admin-ink-2">
            Bond note (optional)
            <input
              className="mt-1 block w-56 rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bondNote}
              onChange={(e) => setBondNote(e.target.value)}
              placeholder="RBO ref or context"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSaveBondOutcome()}
            className="rounded-admin-md border border-admin-line bg-white px-3 py-2 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-50"
          >
            Save bond outcome
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-admin-danger-fg">{error}</p> : null}
        {okMsg ? <p className="mt-2 text-sm text-admin-success-fg">{okMsg}</p> : null}
      </section>
    )
  }

  if (isTerminating) {
    return (
      <section className="mt-6 space-y-3 border-t border-admin-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
          Ending agreement
        </p>
        <div className="space-y-1 text-sm text-admin-ink-2">
          <p>
            Status: <strong>terminating</strong> — effective {terminationEffectiveDate || '—'}. Room
            remains reserved until that date.
          </p>
          <p>
            Acknowledgments:{' '}
            {terminationAcknowledgedAt
              ? `both parties signed (${terminationAcknowledgedAt.slice(0, 10)})`
              : 'waiting for landlord + tenant e-sign'}
          </p>
          {terminationReasonNote ? <p>Reason: {terminationReasonNote}</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-admin-ink-2">
            Bond outcome
            <select
              className="mt-1 block rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bond}
              onChange={(e) => setBond(e.target.value as BondOutcome)}
            >
              {BOND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-admin-ink-2">
            Bond note (optional)
            <input
              className="mt-1 block w-56 rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bondNote}
              onChange={(e) => setBondNote(e.target.value)}
              placeholder="RBO ref or context"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSaveBondOutcome()}
            className="rounded-admin-md border border-admin-line bg-white px-3 py-2 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:opacity-50"
          >
            Save bond outcome
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-admin-danger-fg">{error}</p> : null}
        {okMsg ? <p className="mt-2 text-sm text-admin-success-fg">{okMsg}</p> : null}
      </section>
    )
  }

  // Rare path: collapsed by default so it does not dominate Tenancy agreement.
  return (
    <details className="mt-6 border-t border-admin-line pt-4 group">
      <summary className="cursor-pointer list-none text-sm font-medium text-admin-ink-4 hover:text-admin-ink-2 [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 group-open:underline">End agreement (mutual surrender)</span>
        <span className="ml-2 font-normal text-admin-ink-5">— rarely needed</span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-admin-ink-4">
          Ends a live Listing agreement by written agreement (not the same as cancelling an
          application). Both parties e-sign a mutual termination acknowledgment.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-admin-ink-2">
            Effective date
            <input
              type="date"
              required
              className="mt-1 w-full rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-admin-ink-2">
            Bond outcome
            <select
              className="mt-1 w-full rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bond}
              onChange={(e) => setBond(e.target.value as BondOutcome)}
            >
              {BOND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-normal text-admin-ink-5">
              Ops checklist only — does not file with RBO.
            </span>
          </label>
          <label className="block text-xs font-medium text-admin-ink-2 sm:col-span-2">
            Reason for ending
            <textarea
              required
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="e.g. Tenant converting from room to whole-unit tenancy by agreement"
            />
            <span className="mt-1 block font-normal text-admin-ink-5">
              Saved on the booking as the termination reason (required).
            </span>
          </label>
          <label className="block text-xs font-medium text-admin-ink-2 sm:col-span-2">
            Bond note (optional)
            <input
              className="mt-1 w-full rounded-admin-sm border border-admin-input-border bg-white px-2 py-1.5 text-sm text-admin-ink-2"
              value={bondNote}
              onChange={(e) => setBondNote(e.target.value)}
              placeholder="RBO reference or bond context"
            />
          </label>
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() => void onInitiate()}
            className="sm:col-span-2 inline-flex min-h-[2.75rem] items-center justify-center rounded-admin-md bg-admin-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-admin-coral-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Confirm & send for e-sign'}
          </button>
          {!canSubmit ? (
            <p className="sm:col-span-2 text-xs text-admin-ink-5">
              Enter an effective date and a reason (at least a few words) to enable confirm.
            </p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-admin-danger-fg">{error}</p> : null}
        {okMsg ? <p className="text-sm text-admin-success-fg">{okMsg}</p> : null}
      </div>
    </details>
  )
}
