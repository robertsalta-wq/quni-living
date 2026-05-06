import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminCardClass, adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'

type SnapshotRow = Database['public']['Tables']['property_fee_snapshots']['Row']

type TierEditable = {
  fee_mode: 'percent' | 'fixed'
  fee_percent: string
  fee_fixed_cents: string
  student_fee_mode: 'percent' | 'fixed'
  student_fee_percent: string
  student_fee_fixed_cents: string
  card_surcharge_enabled: boolean
  free_transfer_required: boolean
  utilities_cap_aud: string
}

function tierFromRow(row: SnapshotRow): TierEditable {
  return {
    fee_mode: row.fee_mode === 'fixed' ? 'fixed' : 'percent',
    fee_percent: String(row.fee_percent ?? ''),
    fee_fixed_cents: String(row.fee_fixed_cents ?? ''),
    student_fee_mode: row.student_fee_mode === 'fixed' ? 'fixed' : 'percent',
    student_fee_percent: String(row.student_fee_percent ?? ''),
    student_fee_fixed_cents: String(row.student_fee_fixed_cents ?? ''),
    card_surcharge_enabled: Boolean(row.card_surcharge_enabled),
    free_transfer_required: Boolean(row.free_transfer_required),
    utilities_cap_aud: String(row.utilities_cap_aud ?? ''),
  }
}

function parseTier(t: TierEditable, ctx: string) {
  const fee_percent = Number(t.fee_percent)
  const fee_fixed_cents = parseInt(String(t.fee_fixed_cents || '0'), 10)
  const student_fee_percent = Number(t.student_fee_percent)
  const student_fee_fixed_cents = parseInt(String(t.student_fee_fixed_cents || '0'), 10)
  const utilities_cap_aud = parseInt(String(t.utilities_cap_aud || '0'), 10)
  if (!Number.isFinite(fee_percent)) throw new Error(`${ctx}: invalid fee_percent`)
  if (!Number.isFinite(fee_fixed_cents)) throw new Error(`${ctx}: invalid fee_fixed_cents`)
  if (!Number.isFinite(student_fee_percent)) throw new Error(`${ctx}: invalid student_fee_percent`)
  if (!Number.isFinite(student_fee_fixed_cents)) throw new Error(`${ctx}: invalid student_fee_fixed_cents`)
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

export default function AdminPropertyFees() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SnapshotRow[]>([])
  const [listing, setListing] = useState<TierEditable | null>(null)
  const [managed, setManaged] = useState<TierEditable | null>(null)
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
      } else {
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
    void load()
  }, [load])

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

  if (!propertyId) {
    return <p className="text-sm text-gray-600">Missing property id.</p>
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/properties" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          ← Properties
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Listing fee snapshots</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {title ? <span className="font-medium text-gray-800">{title}</span> : 'Property'}{' '}
        <span className="text-gray-400 font-mono text-xs">({propertyId})</span>
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listing && managed ? (
        <form onSubmit={onSave} className={`${adminCardClass} space-y-8`}>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quni Listing tier</h2>
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
                <label className={labelClass}>Landlord fee (cents fixed)</label>
                <input
                  className={inputClass}
                  type="text"
                  inputMode="numeric"
                  value={listing.fee_fixed_cents}
                  onChange={(e) => setListing({ ...listing, fee_fixed_cents: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Student fee mode</label>
                <select
                  className={inputClass}
                  value={listing.student_fee_mode}
                  onChange={(e) => setListing({ ...listing, student_fee_mode: e.target.value as 'percent' | 'fixed' })}
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
                <label className={labelClass}>Student fee (cents)</label>
                <input
                  className={inputClass}
                  type="text"
                  value={listing.student_fee_fixed_cents}
                  onChange={(e) => setListing({ ...listing, student_fee_fixed_cents: e.target.value })}
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

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quni Managed tier</h2>
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
                <label className={labelClass}>Landlord fee (cents fixed)</label>
                <input
                  className={inputClass}
                  type="text"
                  value={managed.fee_fixed_cents}
                  onChange={(e) => setManaged({ ...managed, fee_fixed_cents: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Student fee mode</label>
                <select
                  className={inputClass}
                  value={managed.student_fee_mode}
                  onChange={(e) => setManaged({ ...managed, student_fee_mode: e.target.value as 'percent' | 'fixed' })}
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
                <label className={labelClass}>Student fee (cents)</label>
                <input
                  className={inputClass}
                  type="text"
                  value={managed.student_fee_fixed_cents}
                  onChange={(e) => setManaged({ ...managed, student_fee_fixed_cents: e.target.value })}
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

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save fee snapshots'}
            </button>
          </div>
        </form>
      ) : null}

      <div className={`${adminCardClass} mt-10 space-y-4`}>
        <h2 className="text-lg font-semibold text-gray-900">Reset to current template</h2>
        <p className="text-sm text-gray-600">
          Re-snapshot both tiers from live <code className="text-xs bg-gray-100 px-1 rounded">pricing_config</code> for this
          property&apos;s current tier (derived from listing fields). Creates new history rows.
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
          disabled={resetting || !propertyId}
          onClick={() => void onResetTemplate()}
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
        >
          {resetting ? 'Resetting…' : 'Reset from pricing template'}
        </button>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Snapshot history</h2>
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
                  <td colSpan={5} className={`${adminTdClass} text-gray-500 text-center py-8`}>
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
    </div>
  )
}
