import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminCardClass, adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'

type SnapshotRow = Database['public']['Tables']['property_fee_snapshots']['Row']

/** Match `PricingPage.tsx` for fixed-fee dollar fields (cents <-> dollar string). */
function centsToDollarsForEditing(cents: number): string {
  return (Number(cents || 0) / 100).toFixed(2)
}

function parseDollarsInputToCents(raw: string): number | null {
  const normalized = raw.replace(/\$/g, '').replace(/,/g, '').trim()
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

type TierEditable = {
  fee_mode: 'percent' | 'fixed'
  fee_percent: string
  fee_fixed_dollars: string
  student_fee_mode: 'percent' | 'fixed'
  student_fee_percent: string
  student_fee_fixed_dollars: string
  card_surcharge_enabled: boolean
  free_transfer_required: boolean
  utilities_cap_aud: string
}

function tierFromRow(row: SnapshotRow): TierEditable {
  return {
    fee_mode: row.fee_mode === 'fixed' ? 'fixed' : 'percent',
    fee_percent: String(row.fee_percent ?? ''),
    fee_fixed_dollars: centsToDollarsForEditing(row.fee_fixed_cents),
    student_fee_mode: row.student_fee_mode === 'fixed' ? 'fixed' : 'percent',
    student_fee_percent: String(row.student_fee_percent ?? ''),
    student_fee_fixed_dollars: centsToDollarsForEditing(row.student_fee_fixed_cents),
    card_surcharge_enabled: Boolean(row.card_surcharge_enabled),
    free_transfer_required: Boolean(row.free_transfer_required),
    utilities_cap_aud: String(row.utilities_cap_aud ?? ''),
  }
}

function parseTier(t: TierEditable, ctx: string) {
  const fee_percent = Number(t.fee_percent)
  const fee_fixed_raw = parseDollarsInputToCents(t.fee_fixed_dollars)
  const fee_fixed_cents = fee_fixed_raw ?? 0
  const student_fee_percent = Number(t.student_fee_percent)
  const student_fee_raw = parseDollarsInputToCents(t.student_fee_fixed_dollars)
  const student_fee_fixed_cents = student_fee_raw ?? 0
  const utilities_cap_aud = parseInt(String(t.utilities_cap_aud || '0'), 10)
  if (!Number.isFinite(fee_percent)) throw new Error(`${ctx}: invalid fee_percent`)
  if (!Number.isFinite(fee_fixed_cents)) throw new Error(`${ctx}: invalid landlord fixed fee`)
  if (!Number.isFinite(student_fee_percent)) throw new Error(`${ctx}: invalid student_fee_percent`)
  if (!Number.isFinite(student_fee_fixed_cents)) throw new Error(`${ctx}: invalid student fixed fee`)
  if (!Number.isFinite(utilities_cap_aud) || utilities_cap_aud < 0) throw new Error(`${ctx}: invalid utilities_cap_aud`)
  return {
    fee_mode: t.fee_mode,
    fee_percent,
    fee_fixed_cents,
    student_fee_mode: t.student_fee_mode,
    student_fee_percent,
    student_fee_fixed_cents,
    card_surcharge_enabled: t.card_surcharge_enabled,
    free_transfer_required: t.free_transfer_required,
    utilities_cap_aud,
  }
}

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

export type PropertyFeeSnapshotsModalProps = {
  open: boolean
  propertyId: string | null
  onClose: () => void
}

export function PropertyFeeSnapshotsModal({ open, propertyId, onClose }: PropertyFeeSnapshotsModalProps) {
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SnapshotRow[]>([])
  const [listing, setListing] = useState<TierEditable | null>(null)
  const [managed, setManaged] = useState<TierEditable | null>(null)
  const [listingBaseline, setListingBaseline] = useState<SnapshotRow | null>(null)
  const [managedBaseline, setManagedBaseline] = useState<SnapshotRow | null>(null)
  const [changeReason, setChangeReason] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !propertyId) return
    setLoading(true)
    setError(null)
    try {
      const { data: prop, error: pErr } = await supabase.from('properties').select('title').eq('id', propertyId).maybeSingle()
      if (pErr) throw pErr
      setTitle(prop?.title ?? null)

      const { data: rows, error: sErr } = await supabase
        .from('property_fee_snapshots')
        .select('*')
        .eq('property_id', propertyId)
        .order('snapshot_taken_at', { ascending: false })
      if (sErr) throw sErr
      const list = (rows ?? []) as SnapshotRow[]
      setHistory(list)

      const activeListing = list.find((r) => r.is_active && r.service_tier === 'listing')
      const activeManaged = list.find((r) => r.is_active && r.service_tier === 'managed')
      if (!activeListing || !activeManaged) {
        setError('No active fee snapshots for this listing. Apply the database migration and backfill.')
        setListing(null)
        setManaged(null)
        setListingBaseline(null)
        setManagedBaseline(null)
      } else {
        setListingBaseline(activeListing)
        setManagedBaseline(activeManaged)
        setListing(tierFromRow(activeListing))
        setManaged(tierFromRow(activeManaged))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load fee snapshots')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (open && propertyId) void load()
  }, [open, propertyId, load])

  useEffect(() => {
    if (!open) return
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function commitListingFixed(field: 'fee' | 'student', rawOverride?: string) {
    setListing((prev) => {
      if (!prev) return prev
      const raw = rawOverride ?? (field === 'fee' ? prev.fee_fixed_dollars : prev.student_fee_fixed_dollars)
      const parsed = parseDollarsInputToCents(raw)
      const fallback =
        field === 'fee'
          ? (listingBaseline?.fee_fixed_cents ?? 0)
          : (listingBaseline?.student_fee_fixed_cents ?? 0)
      const cents = parsed ?? fallback
      const formatted = centsToDollarsForEditing(cents)
      return field === 'fee' ? { ...prev, fee_fixed_dollars: formatted } : { ...prev, student_fee_fixed_dollars: formatted }
    })
  }

  function commitManagedFixed(field: 'fee' | 'student', rawOverride?: string) {
    setManaged((prev) => {
      if (!prev) return prev
      const raw = rawOverride ?? (field === 'fee' ? prev.fee_fixed_dollars : prev.student_fee_fixed_dollars)
      const parsed = parseDollarsInputToCents(raw)
      const fallback =
        field === 'fee'
          ? (managedBaseline?.fee_fixed_cents ?? 0)
          : (managedBaseline?.student_fee_fixed_cents ?? 0)
      const cents = parsed ?? fallback
      const formatted = centsToDollarsForEditing(cents)
      return field === 'fee' ? { ...prev, fee_fixed_dollars: formatted } : { ...prev, student_fee_fixed_dollars: formatted }
    })
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId || !listing || !managed) return
    const reason = changeReason.trim()
    if (!reason) {
      setError('Change reason is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const L = parseTier(listing, 'Listing tier')
      const M = parseTier(managed, 'Managed tier')
      const { error: rErr } = await supabase.rpc('admin_update_property_fee_snapshots', {
        p_property_id: propertyId,
        p_change_reason: reason,
        p_listing_fee_mode: L.fee_mode,
        p_listing_fee_percent: L.fee_percent,
        p_listing_fee_fixed_cents: L.fee_fixed_cents,
        p_listing_student_fee_mode: L.student_fee_mode,
        p_listing_student_fee_percent: L.student_fee_percent,
        p_listing_student_fee_fixed_cents: L.student_fee_fixed_cents,
        p_listing_card_surcharge_enabled: L.card_surcharge_enabled,
        p_listing_free_transfer_required: L.free_transfer_required,
        p_listing_utilities_cap_aud: L.utilities_cap_aud,
        p_managed_fee_mode: M.fee_mode,
        p_managed_fee_percent: M.fee_percent,
        p_managed_fee_fixed_cents: M.fee_fixed_cents,
        p_managed_student_fee_mode: M.student_fee_mode,
        p_managed_student_fee_percent: M.student_fee_percent,
        p_managed_student_fee_fixed_cents: M.student_fee_fixed_cents,
        p_managed_card_surcharge_enabled: M.card_surcharge_enabled,
        p_managed_free_transfer_required: M.free_transfer_required,
        p_managed_utilities_cap_aud: M.utilities_cap_aud,
      })
      if (rErr) throw rErr
      setChangeReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onResetTemplate() {
    if (!propertyId) return
    const reason = resetReason.trim()
    if (!reason) {
      setError('Change reason is required for reset')
      return
    }
    setResetting(true)
    setError(null)
    try {
      const { error: rErr } = await supabase.rpc('admin_reset_property_fee_snapshots_from_template', {
        p_property_id: propertyId,
        p_change_reason: reason,
      })
      if (rErr) throw rErr
      setResetReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  if (!open || !propertyId) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fee-snapshots-title"
        className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="fee-snapshots-title" className="text-lg font-semibold text-gray-900">
              Listing fee snapshots
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {title ? <span className="font-medium text-gray-800">{title}</span> : 'Property'}{' '}
              <span className="font-mono text-xs text-gray-400">({propertyId})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : listing && managed ? (
            <>
              <form id="fee-snapshots-form" onSubmit={onSave} className="space-y-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  <section className={`${adminCardClass} space-y-4`}>
                    <h3 className="text-base font-semibold text-gray-900">Quni Listing tier</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Landlord fee mode</label>
                        <select
                          className={inputClass}
                          value={listing.fee_mode}
                          onChange={(e) => setListing({ ...listing, fee_mode: e.target.value as 'percent' | 'fixed' })}
                        >
                          <option value="percent">percent</option>
                          <option value="fixed">fixed</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Landlord fee %</label>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={listing.fee_percent}
                          onChange={(e) => setListing({ ...listing, fee_percent: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Landlord fixed fee ($)</label>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={listing.fee_fixed_dollars}
                          onChange={(e) => setListing({ ...listing, fee_fixed_dollars: e.target.value })}
                          onBlur={(e) => commitListingFixed('fee', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Student fee mode</label>
                        <select
                          className={inputClass}
                          value={listing.student_fee_mode}
                          onChange={(e) =>
                            setListing({ ...listing, student_fee_mode: e.target.value as 'percent' | 'fixed' })
                          }
                        >
                          <option value="percent">percent</option>
                          <option value="fixed">fixed</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Student fee %</label>
                        <input
                          className={inputClass}
                          type="text"
                          value={listing.student_fee_percent}
                          onChange={(e) => setListing({ ...listing, student_fee_percent: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Student fixed fee ($)</label>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={listing.student_fee_fixed_dollars}
                          onChange={(e) => setListing({ ...listing, student_fee_fixed_dollars: e.target.value })}
                          onBlur={(e) => commitListingFixed('student', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Utilities cap (AUD)</label>
                        <input
                          className={inputClass}
                          type="text"
                          value={listing.utilities_cap_aud}
                          onChange={(e) => setListing({ ...listing, utilities_cap_aud: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={listing.card_surcharge_enabled}
                            onChange={(e) => setListing({ ...listing, card_surcharge_enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Card surcharge enabled
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={listing.free_transfer_required}
                            onChange={(e) => setListing({ ...listing, free_transfer_required: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Free bank transfer required
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className={`${adminCardClass} space-y-4`}>
                    <h3 className="text-base font-semibold text-gray-900">Quni Managed tier</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Landlord fee mode</label>
                        <select
                          className={inputClass}
                          value={managed.fee_mode}
                          onChange={(e) => setManaged({ ...managed, fee_mode: e.target.value as 'percent' | 'fixed' })}
                        >
                          <option value="percent">percent</option>
                          <option value="fixed">fixed</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Landlord fee %</label>
                        <input
                          className={inputClass}
                          type="text"
                          value={managed.fee_percent}
                          onChange={(e) => setManaged({ ...managed, fee_percent: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Landlord fixed fee ($)</label>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={managed.fee_fixed_dollars}
                          onChange={(e) => setManaged({ ...managed, fee_fixed_dollars: e.target.value })}
                          onBlur={(e) => commitManagedFixed('fee', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Student fee mode</label>
                        <select
                          className={inputClass}
                          value={managed.student_fee_mode}
                          onChange={(e) =>
                            setManaged({ ...managed, student_fee_mode: e.target.value as 'percent' | 'fixed' })
                          }
                        >
                          <option value="percent">percent</option>
                          <option value="fixed">fixed</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Student fee %</label>
                        <input
                          className={inputClass}
                          type="text"
                          value={managed.student_fee_percent}
                          onChange={(e) => setManaged({ ...managed, student_fee_percent: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Student fixed fee ($)</label>
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={managed.student_fee_fixed_dollars}
                          onChange={(e) => setManaged({ ...managed, student_fee_fixed_dollars: e.target.value })}
                          onBlur={(e) => commitManagedFixed('student', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Utilities cap (AUD)</label>
                        <input
                          className={inputClass}
                          type="text"
                          value={managed.utilities_cap_aud}
                          onChange={(e) => setManaged({ ...managed, utilities_cap_aud: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={managed.card_surcharge_enabled}
                            onChange={(e) => setManaged({ ...managed, card_surcharge_enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Card surcharge enabled
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={managed.free_transfer_required}
                            onChange={(e) => setManaged({ ...managed, free_transfer_required: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Free bank transfer required
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                <div>
                  <label className={labelClass}>Reason for this change (required)</label>
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Audit trail — describe why fees are changing"
                    required
                  />
                </div>
              </form>

              <div className={`${adminCardClass} mt-8 space-y-4`}>
                <h3 className="text-base font-semibold text-gray-900">Reset to current template</h3>
                <p className="text-sm text-gray-600">
                  Re-snapshot both tiers from live{' '}
                  <code className="rounded bg-gray-100 px-1 text-xs">pricing_config</code> for this property&apos;s current tier
                  (derived from listing fields). Creates new history rows.
                </p>
                <div>
                  <label className={labelClass}>Reason (required)</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    placeholder="Why resetting to template"
                  />
                </div>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => void onResetTemplate()}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
                >
                  {resetting ? 'Resetting…' : 'Reset from pricing template'}
                </button>
              </div>

              <details className="mt-8 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">Snapshot history</summary>
                <div className="mt-4">
                  <div className={adminTableWrapClass}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={adminThClass}>Taken</th>
                          <th className={adminThClass}>Tier</th>
                          <th className={adminThClass}>Source</th>
                          <th className={adminThClass}>Active</th>
                          <th className={adminThClass}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={`${adminTdClass} py-8 text-center text-gray-500`}>
                              No rows.
                            </td>
                          </tr>
                        ) : (
                          history.map((row) => (
                            <tr key={row.id}>
                              <td className={adminTdClass}>{new Date(row.snapshot_taken_at).toLocaleString('en-AU')}</td>
                              <td className={adminTdClass}>{row.service_tier}</td>
                              <td className={adminTdClass}>{row.snapshot_source}</td>
                              <td className={adminTdClass}>{row.is_active ? 'yes' : 'no'}</td>
                              <td className={`${adminTdClass} max-w-xs truncate`}>{row.change_reason ?? '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/90 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="fee-snapshots-form"
            disabled={saving || !listing || !managed}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save fee snapshots'}
          </button>
        </div>
      </div>
    </div>
  )
}
