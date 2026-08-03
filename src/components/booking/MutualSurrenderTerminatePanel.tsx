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
  bondOutcome?: string | null
  onUpdated: () => void
}

export function MutualSurrenderTerminatePanel({
  bookingId,
  status,
  serviceTierFinal,
  terminationEffectiveDate,
  terminationAcknowledgedAt,
  bondOutcome,
  onUpdated,
}: Props) {
  const [effectiveDate, setEffectiveDate] = useState('')
  const [bond, setBond] = useState<BondOutcome>('never_lodged')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const canInitiate =
    serviceTierFinal === 'listing' && (status === 'confirmed' || status === 'active')
  const isTerminating = status === 'terminating'
  const isTerminated = status === 'terminated'

  if (serviceTierFinal !== 'listing') return null
  if (!canInitiate && !isTerminating && !isTerminated) return null

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not signed in')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  async function onInitiate() {
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
          bondOutcome: bond,
          bondOutcomeNote: note || null,
          continueInSamePremises: true,
          reasonNote: 'Mutual surrender — tenant converting / ending by agreement',
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
          bondOutcomeNote: note || null,
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

  return (
    <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
      <h3 className="text-sm font-semibold text-ink">End agreement (mutual surrender)</h3>
      <p className="mt-1 text-xs text-ink/70">
        Ends a live Listing agreement by written agreement — distinct from cancelling an application.
        Both parties e-sign a mutual termination acknowledgment.
      </p>

      {isTerminated ? (
        <p className="mt-3 text-sm text-ink">
          Agreement terminated
          {terminationEffectiveDate ? ` (effective ${terminationEffectiveDate})` : ''}. Bond outcome:{' '}
          {bondOutcome || 'not recorded'}.
        </p>
      ) : null}

      {isTerminating ? (
        <div className="mt-3 space-y-2 text-sm text-ink">
          <p>
            Status: <strong>terminating</strong> — effective{' '}
            {terminationEffectiveDate || '—'}. Room remains reserved until that date.
          </p>
          <p>
            Acknowledgments:{' '}
            {terminationAcknowledgedAt
              ? `both parties signed (${terminationAcknowledgedAt.slice(0, 10)})`
              : 'waiting for landlord + tenant e-sign'}
          </p>
        </div>
      ) : null}

      {canInitiate ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            Effective date
            <input
              type="date"
              className="mt-1 w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            Bond outcome (checklist)
            <select
              className="mt-1 w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
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
          <label className="block text-xs sm:col-span-2">
            Note (optional)
            <input
              className="mt-1 w-full rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="RBO ref or context"
            />
          </label>
          <button
            type="button"
            disabled={busy || !effectiveDate}
            onClick={() => void onInitiate()}
            className="sm:col-span-2 rounded bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Start mutual surrender'}
          </button>
        </div>
      ) : null}

      {(isTerminating || isTerminated) && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block text-xs">
            Update bond outcome
            <select
              className="mt-1 block rounded border border-ink/20 bg-white px-2 py-1.5 text-sm"
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
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSaveBondOutcome()}
            className="rounded border border-ink/30 bg-white px-3 py-2 text-sm"
          >
            Save bond outcome
          </button>
        </div>
      )}

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {okMsg ? <p className="mt-2 text-sm text-emerald-800">{okMsg}</p> : null}
    </section>
  )
}
