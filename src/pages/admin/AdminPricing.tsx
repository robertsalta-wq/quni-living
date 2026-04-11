import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { adminCardClass } from './adminUi'
import type { TierId, PricingConfigRow, VolumeTierRow, ChangeLogRow, EarlyAdopterUi } from '../../lib/adminPricingSupabase'
import {
  fetchAdminPricingBundle,
  savePricingFeeFields,
  savePricingEarlyFields,
  saveVolumeDiscountTiers,
  refreshChangeLog,
  earlyUiFromRow,
  formatLogValue,
} from '../../lib/adminPricingSupabase'

type TabId = 'tiers' | 'volume' | 'early' | 'summary' | 'log'

type TierMeta = {
  id: TierId
  name: string
  sub: string
  legal: string
  doc: string
  bond: string
  status: 'live' | 'phase2' | 'deferred'
  statusLabel: string
}

const TIERS: TierMeta[] = [
  {
    id: 't1',
    name: 'Hosted room',
    sub: 'Landlord lives on-site',
    legal: 'Boarder/lodger — RTA does not apply',
    doc: 'Custom Quni Occupancy Agreement',
    bond: 'Held by landlord — no RBO required',
    status: 'live',
    statusLabel: 'Live — Phase 1',
  },
  {
    id: 't2',
    name: 'Private room',
    sub: 'Landlord does not live on-site',
    legal: 'Residential Tenancies Act 2010 (NSW)',
    doc: 'Prescribed form FT6600 + Quni Addendum',
    bond: 'Lodged via NSW Fair Trading RBO — mandatory',
    status: 'live',
    statusLabel: 'Live — Phase 1',
  },
  {
    id: 't3',
    name: 'Boarding house',
    sub: '5+ paying residents',
    legal: 'Boarding Houses Act 2012 (NSW)',
    doc: 'Boarding house agreement (TBD)',
    bond: 'Per Boarding Houses Act requirements',
    status: 'deferred',
    statusLabel: 'Deferred — post-launch',
  },
]

const TIER_PAYMENT_NOTES: Record<TierId, string> = {
  t1: 'Platform can mandate Quni payment — RTA does not apply',
  t2: 'Bank transfer must be offered free — s.35 RTA',
  t3: 'Per Boarding Houses Act 2012 requirements',
}

const TAB_ORDER: TabId[] = ['tiers', 'volume', 'early', 'summary', 'log']

const WORD_PROMPT =
  'Generate a Word document version of the Quni Living pricing card showing all three tiers, volume discounts, early adopter pricing, and fee model options in a format suitable for inserting into the business plan and marketing plan.'

const BUSINESS_PROMPT =
  'Generate business plan insert text for the Quni Living fee structure based on the current pricing card settings.'

const MARKETING_PROMPT =
  'Generate marketing plan insert text for the Quni Living fee structure based on the current pricing card settings.'

function fmtNowAu(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} ${time}`
}

function formatLogTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function logFieldLabel(fieldName: string): string {
  const map: Record<string, string> = {
    svc_fee_pct: 'Service fee %',
    student_fee_type: 'Student fee type',
    card_surcharge_enabled: 'Card surcharge',
    free_transfer_required: 'Free bank transfer',
    fee_model: 'Fee model',
    utilities_cap: 'Utilities cap',
    early_adopter_active: 'Early adopter active',
    early_adopter_type: 'Early adopter type',
    early_adopter_value: 'Early adopter value',
    early_adopter_expiry_type: 'Early adopter expiry type',
    early_adopter_expiry_date: 'Early adopter expiry date',
    early_adopter_expiry_count: 'Early adopter max landlords',
  }
  if (map[fieldName]) return map[fieldName]
  if (fieldName.startsWith('volume_discount_tiers.')) return fieldName.replace(/^volume_discount_tiers\.[^.]+\./, '')
  return fieldName
}

function parseMaxRoomsInput(raw: string): number {
  const t = raw.trim().toLowerCase()
  if (t === '' || t === '∞' || t === 'infinity') return 999
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : 999
}

function maxRoomsToInput(n: number): string {
  return n >= 999 ? '∞' : String(n)
}

function cloneVolume(rows: VolumeTierRow[]): VolumeTierRow[] {
  return rows.map((r) => ({ ...r }))
}

function clonePricingFromBundle(m: Record<TierId, PricingConfigRow>): Record<TierId, PricingConfigRow> {
  return {
    t1: { ...m.t1 },
    t2: { ...m.t2 },
    t3: { ...m.t3 },
  }
}

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState<TabId>('tiers')
  const [pricingByTier, setPricingByTier] = useState<Record<TierId, PricingConfigRow> | null>(null)
  /** Last persisted rows — used to diff for changelog and to detect changes. */
  const [baselineByTier, setBaselineByTier] = useState<Record<TierId, PricingConfigRow> | null>(null)
  const [volumeRows, setVolumeRows] = useState<VolumeTierRow[]>([])
  const [baselineVolumeRows, setBaselineVolumeRows] = useState<VolumeTierRow[]>([])
  const [earlyByTier, setEarlyByTier] = useState<Record<TierId, EarlyAdopterUi> | null>(null)
  const [changeLog, setChangeLog] = useState<ChangeLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTier, setSavingTier] = useState<TierId | null>(null)
  const [savingVolume, setSavingVolume] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedText, setLastSavedText] = useState('No changes saved yet')
  const [complianceMessage, setComplianceMessage] = useState<string | null>(null)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const [promptKey, setPromptKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const bundle = await fetchAdminPricingBundle(supabase)
      setPricingByTier(clonePricingFromBundle(bundle.pricingByTier))
      setBaselineByTier(clonePricingFromBundle(bundle.pricingByTier))
      const vol = cloneVolume(bundle.volumeTiers)
      setVolumeRows(vol)
      setBaselineVolumeRows(cloneVolume(bundle.volumeTiers))
      const early: Record<TierId, EarlyAdopterUi> = {
        t1: earlyUiFromRow(bundle.pricingByTier.t1),
        t2: earlyUiFromRow(bundle.pricingByTier.t2),
        t3: earlyUiFromRow(bundle.pricingByTier.t3),
      }
      setEarlyByTier(early)
      setChangeLog(bundle.changeLog)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricing data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changedBy = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const u = data.user
    return u?.email?.trim() || u?.id || 'unknown'
  }, [])

  const refreshLog = useCallback(async () => {
    const rows = await refreshChangeLog(supabase)
    setChangeLog(rows)
  }, [])

  const onSaveTierFees = async (tier: TierId) => {
    if (!pricingByTier || !baselineByTier) return
    setSavingTier(tier)
    setError(null)
    try {
      const by = await changedBy()
      const prevRow = baselineByTier[tier]
      const p = pricingByTier[tier]
      const updated = await savePricingFeeFields(
        supabase,
        tier,
        prevRow,
        {
          svc_fee_pct: p.svc_fee_pct,
          student_fee_type: p.student_fee_type,
          card_surcharge_enabled: p.card_surcharge_enabled,
          free_transfer_required: p.free_transfer_required,
          fee_model: p.fee_model,
          utilities_cap: p.utilities_cap,
        },
        by,
      )
      setPricingByTier((prev) => (prev ? { ...prev, [tier]: updated } : prev))
      setBaselineByTier((prev) => (prev ? { ...prev, [tier]: updated } : prev))
      setEarlyByTier((prev) => {
        if (!prev) return prev
        return { ...prev, [tier]: earlyUiFromRow(updated) }
      })
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTier(null)
    }
  }

  const onSaveEarly = async (tier: TierId) => {
    if (!pricingByTier || !baselineByTier || !earlyByTier) return
    setSavingTier(tier)
    setError(null)
    try {
      const by = await changedBy()
      const prevRow = baselineByTier[tier]
      const ui = earlyByTier[tier]
      const updated = await savePricingEarlyFields(
        supabase,
        tier,
        prevRow,
        ui,
        by,
        pricingByTier[tier].svc_fee_pct,
      )
      setPricingByTier((prev) => (prev ? { ...prev, [tier]: updated } : prev))
      setBaselineByTier((prev) => (prev ? { ...prev, [tier]: updated } : prev))
      setEarlyByTier((prev) => (prev ? { ...prev, [tier]: earlyUiFromRow(updated) } : prev))
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTier(null)
    }
  }

  const onSaveVolume = async () => {
    setSavingVolume(true)
    setError(null)
    try {
      const by = await changedBy()
      const next = await saveVolumeDiscountTiers(supabase, baselineVolumeRows, volumeRows, by)
      const vol = cloneVolume(next)
      setVolumeRows(vol)
      setBaselineVolumeRows(vol)
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingVolume(false)
    }
  }

  const copySummary = async () => {
    if (!pricingByTier || !earlyByTier) return
    let text = 'QUNI LIVING — PRICING & FEE STRUCTURE\n'
    text += `Generated: ${fmtNowAu()}\n\n`
    for (const tier of TIERS) {
      const f = pricingByTier[tier.id]
      const e = earlyByTier[tier.id]
      text += `--- ${tier.name.toUpperCase()} ---\n`
      text += `Legal framework: ${tier.legal}\n`
      text += `Document: ${tier.doc}\n`
      text += `Bond: ${tier.bond}\n`
      text += `Service fee: ${f.svc_fee_pct}%\n`
      text += `Fee model: ${f.fee_model === 'A' ? 'Option A — deduct from landlord payout' : 'Option D — landlord choice'}\n`
      text += `Student fees: ${f.student_fee_type === 'none' ? 'None' : f.student_fee_type}\n`
      text += `Card surcharge: ${f.card_surcharge_enabled ? 'Optional pass-through' : 'N/A'}\n`
      text += `Free bank transfer: ${f.free_transfer_required ? 'Yes — mandatory' : 'Not mandated'}\n`
      if (f.utilities_cap > 0) text += `Utilities cap: $${f.utilities_cap}/quarter\n`
      if (e.active) {
        text += `Early adopter: ${e.type === 'free' ? 'Free' : `${e.value}${e.type === 'percent' ? '% discount' : '% fixed rate'}`}\n`
      }
      text += '\n'
    }
    text += '--- VOLUME DISCOUNTS ---\n'
    for (const v of volumeRows) {
      text += `${v.label}: ${v.discount_rate_pct}%\n`
    }
    try {
      await navigator.clipboard.writeText(text)
      setExportFeedback('Copied!')
      setTimeout(() => setExportFeedback(null), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const copyPrompt = async (key: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setPromptKey(key)
      setTimeout(() => setPromptKey((k) => (k === key ? null : k)), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const onClearLogClick = () => {
    setComplianceMessage(
      'The audit log is retained for compliance purposes and cannot be cleared from the dashboard.',
    )
  }

  const updatePricingField = <K extends keyof PricingConfigRow>(tier: TierId, key: K, value: PricingConfigRow[K]) => {
    setPricingByTier((prev) => {
      if (!prev) return prev
      return { ...prev, [tier]: { ...prev[tier], [key]: value } }
    })
  }

  const updateVolumeRow = (index: number, patch: Partial<VolumeTierRow>) => {
    setVolumeRows((rows) => {
      const next = [...rows]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const updateEarly = (tier: TierId, patch: Partial<EarlyAdopterUi>) => {
    setEarlyByTier((prev) => (prev ? { ...prev, [tier]: { ...prev[tier], ...patch } } : prev))
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="px-4 py-8 md:px-8">
        <p className="text-sm text-amber-800">Supabase is not configured.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h2 className="sr-only">Quni Living pricing and fee structure manager with change log</h2>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading || !pricingByTier || !baselineByTier || !earlyByTier ? (
        <p className="text-sm text-gray-500">Loading pricing…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-medium text-gray-900">Pricing & fee manager</h1>
              <p className="mt-0.5 text-[13px] text-gray-500">Quni Living · Admin dashboard · All changes are date/time stamped</p>
            </div>
            <div className="text-xs text-gray-500">{lastSavedText}</div>
          </div>

          <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 pb-0">
            {TAB_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
                  activeTab === id
                    ? 'border-[#0F6E56] font-medium text-[#0F6E56]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {id === 'tiers' && 'Fee structure'}
                {id === 'volume' && 'Volume discounts'}
                {id === 'early' && 'Early adopter'}
                {id === 'summary' && 'Summary & export'}
                {id === 'log' && (
                  <>
                    Change log{' '}
                    <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {changeLog.length}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'tiers' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {TIERS.map((tier) => {
                const f = pricingByTier[tier.id]
                const badgeClass =
                  tier.status === 'live'
                    ? 'bg-emerald-100 text-[#0F6E56]'
                    : tier.status === 'phase2'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-stone-100 text-stone-600'
                return (
                  <div
                    key={tier.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-gray-200 px-3.5 py-3">
                      <div className="text-sm font-medium text-gray-900">{tier.name}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">{tier.sub}</div>
                      <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                        {tier.statusLabel}
                      </span>
                    </div>
                    <div className="space-y-2.5 px-3.5 py-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Legal framework
                        </label>
                        <p className="text-[11px] leading-snug text-gray-500">{tier.legal}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Document type
                        </label>
                        <p className="text-[11px] leading-snug text-gray-500">{tier.doc}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Bond</label>
                        <p className="text-[11px] leading-snug text-gray-500">{tier.bond}</p>
                      </div>

                      <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Landlord fees
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Service fee (%)
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          min={0}
                          max={25}
                          step={0.5}
                          value={f.svc_fee_pct}
                          onChange={(e) =>
                            updatePricingField(tier.id, 'svc_fee_pct', parseFloat(e.target.value) || 0)
                          }
                        />
                        <p className="mt-0.5 text-[11px] text-gray-500">% of weekly asking rent — deducted before payout</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Fee model</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          value={f.fee_model}
                          onChange={(e) => updatePricingField(tier.id, 'fee_model', e.target.value)}
                        >
                          <option value="A">Option A — deduct from landlord rent</option>
                          <option value="D">Option D — landlord chooses A or gross-up</option>
                        </select>
                      </div>

                      <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Student fees
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Platform fee</label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          value={f.student_fee_type}
                          onChange={(e) => updatePricingField(tier.id, 'student_fee_type', e.target.value)}
                        >
                          <option value="none">None — students pay zero</option>
                          <option value="percent">% of weekly rent</option>
                          <option value="fixed">Fixed booking fee</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-800">Optional card surcharge (pass-through)</span>
                        <label className="relative inline-flex h-[18px] w-8 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={f.card_surcharge_enabled}
                            onChange={(e) =>
                              updatePricingField(tier.id, 'card_surcharge_enabled', e.target.checked)
                            }
                          />
                          <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-[#1D9E75]" />
                          <span className="absolute bottom-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-[14px]" />
                        </label>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-800">Free bank transfer always offered</span>
                        <label className="relative inline-flex h-[18px] w-8 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={f.free_transfer_required}
                            onChange={(e) =>
                              updatePricingField(tier.id, 'free_transfer_required', e.target.checked)
                            }
                          />
                          <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-[#1D9E75]" />
                          <span className="absolute bottom-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-[14px]" />
                        </label>
                      </div>
                      <p className="py-1 text-[10px] italic leading-snug text-gray-500">{TIER_PAYMENT_NOTES[tier.id]}</p>

                      <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Utilities
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Quarterly cap (AUD $)
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          min={0}
                          step={50}
                          value={f.utilities_cap}
                          onChange={(e) =>
                            updatePricingField(tier.id, 'utilities_cap', parseFloat(e.target.value) || 0)
                          }
                        />
                        <p className="mt-0.5 text-[11px] text-gray-500">0 = not applicable / billed separately</p>
                      </div>

                      <button
                        type="button"
                        disabled={savingTier === tier.id}
                        onClick={() => void onSaveTierFees(tier.id)}
                        className="mt-3 w-full rounded-md bg-[#1D9E75] py-1.5 text-xs font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
                      >
                        {savingTier === tier.id ? 'Saving…' : `Save ${tier.name.toLowerCase()}`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'volume' && (
            <div className={`${adminCardClass} mb-3 p-4`}>
              <div className="text-sm font-medium text-gray-900">Volume discount tiers</div>
              <p className="mt-1 text-xs text-gray-500">
                Applied per landlord account across all their active listings. Early adopter pricing overrides volume discount
                while active.
              </p>
              <table className="mt-3 w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Tier
                    </th>
                    <th className="border-b border-gray-200 px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Min rooms
                    </th>
                    <th className="border-b border-gray-200 px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Max rooms
                    </th>
                    <th className="border-b border-gray-200 px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Service fee %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {volumeRows.map((v, i) => (
                    <tr key={v.id}>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          className="w-full min-w-[5rem] rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.label}
                          onChange={(e) => updateVolumeRow(i, { label: e.target.value })}
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          type="number"
                          className="w-14 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.min_rooms}
                          onChange={(e) => updateVolumeRow(i, { min_rooms: parseInt(e.target.value, 10) || 0 })}
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          className="w-14 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={maxRoomsToInput(v.max_rooms)}
                          onChange={(e) => updateVolumeRow(i, { max_rooms: parseMaxRoomsInput(e.target.value) })}
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          type="number"
                          step={0.5}
                          className="w-16 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.discount_rate_pct}
                          onChange={(e) =>
                            updateVolumeRow(i, { discount_rate_pct: parseFloat(e.target.value) || 0 })
                          }
                        />{' '}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                disabled={savingVolume}
                onClick={() => void onSaveVolume()}
                className="mt-3 rounded-md bg-[#1D9E75] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
              >
                {savingVolume ? 'Saving…' : 'Save volume tiers'}
              </button>
            </div>
          )}

          {activeTab === 'early' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {TIERS.map((tier) => {
                const e = earlyByTier[tier.id]
                const svc = pricingByTier[tier.id].svc_fee_pct
                const effectiveDiscountLine =
                  e.type === 'percent'
                    ? `Effective rate: ${(svc * (1 - e.value / 100)).toFixed(1)}% (standard ${svc}%)`
                    : null
                return (
                  <div key={tier.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-3.5 py-3">
                      <div className="text-sm font-medium text-gray-900">{tier.name}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">Early adopter pricing</div>
                    </div>
                    <div className="space-y-2.5 px-3.5 py-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-900">Enable early adopter pricing</span>
                        <label className="relative inline-flex h-[18px] w-8 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={e.active}
                            onChange={(ev) => updateEarly(tier.id, { active: ev.target.checked })}
                          />
                          <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-[#1D9E75]" />
                          <span className="absolute bottom-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-[14px]" />
                        </label>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Pricing type
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          value={e.type}
                          onChange={(ev) => updateEarly(tier.id, { type: ev.target.value as EarlyAdopterUi['type'] })}
                        >
                          <option value="free">Free (0%)</option>
                          <option value="percent">% discount off standard rate</option>
                          <option value="fixed">Fixed reduced rate</option>
                        </select>
                      </div>
                      {e.type !== 'free' ? (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            {e.type === 'percent' ? 'Discount %' : 'Fixed rate %'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                            value={e.value}
                            onChange={(ev) => updateEarly(tier.id, { value: parseFloat(ev.target.value) || 0 })}
                          />
                          {effectiveDiscountLine && (
                            <p className="mt-0.5 text-[11px] text-gray-500">{effectiveDiscountLine}</p>
                          )}
                        </div>
                      ) : (
                        <p className="py-1 text-[11px] text-gray-500">Landlord pays 0% — free listing period</p>
                      )}
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Expiry type
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                          value={e.expiry}
                          onChange={(ev) => updateEarly(tier.id, { expiry: ev.target.value as EarlyAdopterUi['expiry'] })}
                        >
                          <option value="date">By date</option>
                          <option value="count">By number of landlords</option>
                          <option value="both">Whichever comes first</option>
                        </select>
                      </div>
                      {e.expiry !== 'count' && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            Expiry date
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                            value={e.expiryDate}
                            onChange={(ev) => updateEarly(tier.id, { expiryDate: ev.target.value })}
                          />
                        </div>
                      )}
                      {e.expiry !== 'date' && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            Max landlords
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                            value={e.expiryCount}
                            onChange={(ev) => updateEarly(tier.id, { expiryCount: parseInt(ev.target.value, 10) || 1 })}
                          />
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            Early adopter pricing ends after this many landlords sign up
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={savingTier === tier.id}
                        onClick={() => void onSaveEarly(tier.id)}
                        className="mt-3 w-full rounded-md bg-[#1D9E75] py-1.5 text-xs font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
                      >
                        {savingTier === tier.id ? 'Saving…' : `Save ${tier.name.toLowerCase()}`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'summary' && pricingByTier && earlyByTier && (
            <div>
              {TIERS.map((tier) => {
                const f = pricingByTier[tier.id]
                const e = earlyByTier[tier.id]
                const stdRate = f.svc_fee_pct
                const earlyRate = e.active
                  ? e.type === 'free'
                    ? 0
                    : e.type === 'percent'
                      ? Math.round(stdRate * (1 - e.value / 100) * 10) / 10
                      : e.value
                  : null
                return (
                  <div key={tier.id} className="mb-3 rounded-lg bg-gray-50 p-3.5">
                    <div className="mb-2 text-[13px] font-medium text-gray-900">
                      {tier.name}{' '}
                      <span className="text-[11px] font-normal text-gray-500">— {tier.legal}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Standard service fee</span>
                      <span className="text-[#0F6E56]">{stdRate}% of weekly rent</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Fee model</span>
                      <span className="text-[#0F6E56]">
                        {f.fee_model === 'A' ? 'Option A — deduct from landlord payout' : 'Option D — landlord choice'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Student platform fee</span>
                      <span className="text-[#0F6E56]">
                        {f.student_fee_type === 'none' ? 'None — students pay zero' : f.student_fee_type}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Card surcharge</span>
                      <span className="text-[#0F6E56]">
                        {f.card_surcharge_enabled ? 'Optional — passed through at Stripe cost' : 'Not applicable'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Bank transfer</span>
                      <span className="text-[#0F6E56]">
                        {f.free_transfer_required ? 'Always offered free — mandatory' : 'Not mandated (RTA does not apply)'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                      <span>Bond</span>
                      <span className="text-[#0F6E56]">{tier.bond}</span>
                    </div>
                    {f.utilities_cap > 0 && (
                      <div className="flex justify-between border-b border-gray-200 py-1 text-[13px]">
                        <span>Utilities cap</span>
                        <span className="text-[#0F6E56]">${f.utilities_cap}/quarter included</span>
                      </div>
                    )}
                    {e.active && earlyRate !== null && (
                      <div className="flex justify-between py-1 text-[13px] text-[#1D9E75]">
                        <span>Early adopter rate</span>
                        <span className="font-medium text-[#1D9E75]">
                          {earlyRate === 0 ? 'Free (0%)' : `${earlyRate}%`}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <div className="mb-1 text-[11px] text-gray-500">Volume rates (standard)</div>
                      <div className="flex flex-wrap gap-2">
                        {volumeRows.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                          >
                            {v.label}: {v.discount_rate_pct}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copySummary()}
                  className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs text-gray-900 hover:bg-gray-50"
                >
                  {exportFeedback ?? 'Copy summary text'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyPrompt('word', WORD_PROMPT)}
                  className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs text-gray-900 hover:bg-gray-50"
                >
                  {promptKey === 'word' ? 'Copied!' : 'Generate Word document ↗'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyPrompt('biz', BUSINESS_PROMPT)}
                  className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs text-gray-900 hover:bg-gray-50"
                >
                  {promptKey === 'biz' ? 'Copied!' : 'Business plan insert ↗'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyPrompt('mkt', MARKETING_PROMPT)}
                  className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs text-gray-900 hover:bg-gray-50"
                >
                  {promptKey === 'mkt' ? 'Copied!' : 'Marketing plan insert ↗'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-900">Change log</span>
                <button
                  type="button"
                  onClick={onClearLogClick}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  Clear log
                </button>
              </div>
              {complianceMessage && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{complianceMessage}</div>
              )}
              <div>
                {changeLog.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                    No changes recorded yet. Edit any fee field and save to begin logging.
                  </div>
                ) : (
                  changeLog.map((l) => (
                    <div
                      key={l.id}
                      className="grid grid-cols-[140px_1fr_auto] items-start gap-2 border-b border-gray-100 px-4 py-2.5 last:border-b-0"
                    >
                      <div className="font-mono text-[11px] text-gray-500">{formatLogTs(l.changed_at)}</div>
                      <div className="text-xs text-gray-900">
                        <span className="font-medium">{logFieldLabel(l.field_name)}</span>
                        <br />
                        <span className="text-red-800 line-through">{formatLogValue(l.old_value)}</span>{' '}
                        <span className="text-[#0F6E56]">{formatLogValue(l.new_value)}</span>
                      </div>
                      <div className="rounded-md bg-gray-100 px-1.5 py-0.5 text-center text-[10px] text-gray-600">
                        {l.tier ?? '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
