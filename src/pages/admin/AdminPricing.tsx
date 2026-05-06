import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { adminCardClass } from './adminUi'
import type {
  TierId,
  PricingConfigRow,
  VolumeTierRow,
  ChangeLogRow,
  EarlyAdopterUi,
  PricingKey,
  ServiceTierId,
} from '../../lib/adminPricingSupabase'
import {
  fetchAdminPricingBundle,
  savePricingFeeFields,
  savePricingEarlyFields,
  saveVolumeDiscountTiers,
  refreshChangeLog,
  earlyUiFromRow,
  formatLogValue,
} from '../../lib/adminPricingSupabase'

type TabId = 'tiers' | 'volume' | 'early' | 'log'

type TierMeta = {
  id: TierId
  display: string
  name: string
  sub: string
  legal: string
  doc: string
  bond: string
  status: 'live' | 'phase2' | 'deferred'
  statusLabel: string
}
type FixedFeeInputRow = {
  feeFixedInput: string
  studentFeeFixedInput: string
}
type FixedFeeInputState = Record<PricingKey, FixedFeeInputRow>

const TIERS: TierMeta[] = [
  {
    id: 't1',
    display: 'Tier 1 — Hosted Room',
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
    display: 'Tier 2 — Private Room',
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
    display: 'Tier 3 — Boarding House',
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

const TAB_ORDER: TabId[] = ['tiers', 'volume', 'early', 'log']
const SERVICE_TIERS: ServiceTierId[] = ['listing', 'managed']

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
    fee_mode: 'Landlord fee mode',
    fee_percent: 'Landlord fee %',
    fee_fixed_cents: 'Landlord fixed fee ($)',
    student_fee_mode: 'Student fee mode',
    student_fee_percent: 'Student fee %',
    student_fee_fixed_cents: 'Student fixed fee ($)',
    card_surcharge_enabled: 'Card surcharge',
    free_transfer_required: 'Free bank transfer',
    utilities_cap_aud: 'Utilities cap (AUD)',
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

function tierDisplayFromId(tier: string | null): string {
  if (tier === 't1') return 'Tier 1 — Hosted Room'
  if (tier === 't2') return 'Tier 2 — Private Room'
  if (tier === 't3') return 'Tier 3 — Boarding House'
  return '—'
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

function centsToDollarsInput(cents: number): string {
  return (Number(cents || 0) / 100).toFixed(2)
}

function centsToDollarsForEditing(cents: number): string {
  return centsToDollarsInput(cents)
}

function parseDollarsInputToCents(raw: string): number | null {
  const normalized = raw.replace(/\$/g, '').replace(/,/g, '').trim()
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function buildFixedFeeInputs(
  pricingByKey: Record<PricingKey, PricingConfigRow>,
): FixedFeeInputState {
  return Object.fromEntries(
    Object.entries(pricingByKey).map(([k, row]) => [
      k,
      {
        feeFixedInput: centsToDollarsForEditing(row.fee_fixed_cents),
        studentFeeFixedInput: centsToDollarsForEditing(row.student_fee_fixed_cents),
      },
    ]),
  ) as FixedFeeInputState
}

function cloneVolume(rows: VolumeTierRow[]): VolumeTierRow[] {
  return rows.map((r) => ({ ...r }))
}

function clonePricingFromBundle(m: Record<PricingKey, PricingConfigRow>): Record<PricingKey, PricingConfigRow> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v }])) as Record<PricingKey, PricingConfigRow>
}

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState<TabId>('tiers')
  const [pricingByKey, setPricingByKey] = useState<Record<PricingKey, PricingConfigRow> | null>(null)
  const [baselineByKey, setBaselineByKey] = useState<Record<PricingKey, PricingConfigRow> | null>(null)
  const [volumeRows, setVolumeRows] = useState<Record<ServiceTierId, VolumeTierRow[]>>({ listing: [], managed: [] })
  const [baselineVolumeRows, setBaselineVolumeRows] = useState<Record<ServiceTierId, VolumeTierRow[]>>({
    listing: [],
    managed: [],
  })
  const [earlyByKey, setEarlyByKey] = useState<Record<PricingKey, EarlyAdopterUi> | null>(null)
  const [changeLog, setChangeLog] = useState<ChangeLogRow[]>([])
  const [fixedFeeInputs, setFixedFeeInputs] = useState<FixedFeeInputState | null>(null)
  /** Mirrors fixed-fee draft strings synchronously so blur/save never read stale React state one keystroke behind. */
  const fixedFeeDraftRef = useRef<FixedFeeInputState | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingTier, setSavingTier] = useState<TierId | null>(null)
  const [savingVolume, setSavingVolume] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedText, setLastSavedText] = useState('No changes saved yet')
  const [complianceMessage, setComplianceMessage] = useState<string | null>(null)

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
      setPricingByKey(clonePricingFromBundle(bundle.pricingByKey))
      setBaselineByKey(clonePricingFromBundle(bundle.pricingByKey))
      const feeDrafts = buildFixedFeeInputs(bundle.pricingByKey)
      fixedFeeDraftRef.current = feeDrafts
      setFixedFeeInputs(feeDrafts)
      setVolumeRows({
        listing: cloneVolume(bundle.volumeTiersByService.listing),
        managed: cloneVolume(bundle.volumeTiersByService.managed),
      })
      setBaselineVolumeRows({
        listing: cloneVolume(bundle.volumeTiersByService.listing),
        managed: cloneVolume(bundle.volumeTiersByService.managed),
      })
      const early = Object.fromEntries(
        Object.entries(bundle.pricingByKey).map(([k, v]) => [k, earlyUiFromRow(v)]),
      ) as Record<PricingKey, EarlyAdopterUi>
      setEarlyByKey(early)
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

  const keyFor = (propertyTier: TierId, serviceTier: ServiceTierId): PricingKey =>
    `${propertyTier}:${serviceTier}`

  const onSaveTierFees = async (propertyTier: TierId, serviceTier: ServiceTierId) => {
    if (!pricingByKey || !baselineByKey) return
    setSavingTier(propertyTier)
    setError(null)
    try {
      const key = keyFor(propertyTier, serviceTier)
      const by = await changedBy()
      const prevRow = baselineByKey[key]
      const draft = fixedFeeDraftRef.current
      const fixedRaw = draft?.[key]?.feeFixedInput ?? centsToDollarsForEditing(prevRow.fee_fixed_cents)
      const studentRaw =
        draft?.[key]?.studentFeeFixedInput ?? centsToDollarsForEditing(prevRow.student_fee_fixed_cents)
      const parsedFixed = parseDollarsInputToCents(fixedRaw)
      const parsedStudent = parseDollarsInputToCents(studentRaw)
      const p = {
        ...(pricingByKey[key] ?? prevRow),
        fee_fixed_cents: parsedFixed == null ? prevRow.fee_fixed_cents : parsedFixed,
        student_fee_fixed_cents:
          parsedStudent == null ? prevRow.student_fee_fixed_cents : parsedStudent,
      } as PricingConfigRow
      const updated = await savePricingFeeFields(
        supabase,
        propertyTier,
        serviceTier,
        prevRow,
        {
          fee_mode: p.fee_mode,
          fee_percent: p.fee_percent,
          fee_fixed_cents: p.fee_fixed_cents,
          student_fee_mode: p.student_fee_mode,
          student_fee_percent: p.student_fee_percent,
          student_fee_fixed_cents: p.student_fee_fixed_cents,
          card_surcharge_enabled: p.card_surcharge_enabled,
          free_transfer_required: p.free_transfer_required,
          utilities_cap_aud: p.utilities_cap_aud,
        },
        by,
      )
      setPricingByKey((prev) => (prev ? { ...prev, [key]: updated } : prev))
      setBaselineByKey((prev) => (prev ? { ...prev, [key]: updated } : prev))
      setEarlyByKey((prev) => {
        if (!prev) return prev
        return { ...prev, [key]: earlyUiFromRow(updated) }
      })
      setFixedFeeInputs((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          [key]: {
            feeFixedInput: centsToDollarsForEditing(updated.fee_fixed_cents),
            studentFeeFixedInput: centsToDollarsForEditing(updated.student_fee_fixed_cents),
          },
        }
        fixedFeeDraftRef.current = next
        return next
      })
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTier(null)
    }
  }

  const onSaveEarly = async (propertyTier: TierId, serviceTier: ServiceTierId) => {
    if (!pricingByKey || !baselineByKey || !earlyByKey) return
    setSavingTier(propertyTier)
    setError(null)
    try {
      const by = await changedBy()
      const key = keyFor(propertyTier, serviceTier)
      const prevRow = baselineByKey[key]
      const ui = earlyByKey[key]
      const updated = await savePricingEarlyFields(
        supabase,
        propertyTier,
        serviceTier,
        prevRow,
        ui,
        by,
        pricingByKey[key].fee_percent,
      )
      setPricingByKey((prev) => (prev ? { ...prev, [key]: updated } : prev))
      setBaselineByKey((prev) => (prev ? { ...prev, [key]: updated } : prev))
      setEarlyByKey((prev) => (prev ? { ...prev, [key]: earlyUiFromRow(updated) } : prev))
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTier(null)
    }
  }

  const onSaveVolume = async (serviceTier: ServiceTierId) => {
    setSavingVolume(true)
    setError(null)
    try {
      const by = await changedBy()
      const next = await saveVolumeDiscountTiers(
        supabase,
        serviceTier,
        baselineVolumeRows[serviceTier],
        volumeRows[serviceTier],
        by,
      )
      setVolumeRows((prev) => ({ ...prev, [serviceTier]: cloneVolume(next) }))
      setBaselineVolumeRows((prev) => ({ ...prev, [serviceTier]: cloneVolume(next) }))
      setLastSavedText(`Last saved: ${fmtNowAu()}`)
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingVolume(false)
    }
  }

  const onClearLogClick = () => {
    setComplianceMessage(
      'The audit log is retained for compliance purposes and cannot be cleared from the dashboard.',
    )
  }

  const updatePricingField = <K extends keyof PricingConfigRow>(
    propertyTier: TierId,
    serviceTier: ServiceTierId,
    key: K,
    value: PricingConfigRow[K],
  ) => {
    const rowKey = keyFor(propertyTier, serviceTier)
    setPricingByKey((prev) => {
      if (!prev) return prev
      return { ...prev, [rowKey]: { ...prev[rowKey], [key]: value } }
    })
  }

  const updateFixedFeeInput = (
    propertyTier: TierId,
    serviceTier: ServiceTierId,
    field: 'fee' | 'student',
    value: string,
  ) => {
    const rowKey = keyFor(propertyTier, serviceTier)
    setFixedFeeInputs((prev) => {
      if (!prev) return prev
      const curr = prev[rowKey] ?? {
        feeFixedInput: '0.00',
        studentFeeFixedInput: '0.00',
      }
      const next = {
        ...prev,
        [rowKey]:
          field === 'fee'
            ? { ...curr, feeFixedInput: value }
            : { ...curr, studentFeeFixedInput: value },
      }
      fixedFeeDraftRef.current = next
      return next
    })
  }

  const commitFixedFeeInput = (
    propertyTier: TierId,
    serviceTier: ServiceTierId,
    field: 'fee' | 'student',
    /** Prefer DOM value on blur — React state can lag one keystroke behind blur. */
    rawOverride?: string,
  ) => {
    const rowKey = keyFor(propertyTier, serviceTier)
    if (!pricingByKey) return
    const draft = fixedFeeDraftRef.current
    const raw =
      rawOverride ??
      (field === 'fee' ? draft?.[rowKey]?.feeFixedInput : draft?.[rowKey]?.studentFeeFixedInput) ??
      ''
    const parsed = parseDollarsInputToCents(raw)
    const existing = pricingByKey[rowKey]
    const fallback = field === 'fee' ? existing.fee_fixed_cents : existing.student_fee_fixed_cents
    const nextCents = parsed == null ? fallback : parsed
    if (field === 'fee') {
      updatePricingField(propertyTier, serviceTier, 'fee_fixed_cents', nextCents)
    } else {
      updatePricingField(propertyTier, serviceTier, 'student_fee_fixed_cents', nextCents)
    }
    setFixedFeeInputs((prev) => {
      if (!prev) return prev
      const prevRowDraft = prev[rowKey] ?? {
        feeFixedInput: '0.00',
        studentFeeFixedInput: '0.00',
      }
      const next = {
        ...prev,
        [rowKey]:
          field === 'fee'
            ? { ...prevRowDraft, feeFixedInput: centsToDollarsForEditing(nextCents) }
            : { ...prevRowDraft, studentFeeFixedInput: centsToDollarsForEditing(nextCents) },
      }
      fixedFeeDraftRef.current = next
      return next
    })
  }

  const updateVolumeRow = (serviceTier: ServiceTierId, index: number, patch: Partial<VolumeTierRow>) => {
    setVolumeRows((rows) => {
      const next = [...rows[serviceTier]]
      next[index] = { ...next[index], ...patch }
      return { ...rows, [serviceTier]: next }
    })
  }

  const updateEarly = (propertyTier: TierId, serviceTier: ServiceTierId, patch: Partial<EarlyAdopterUi>) => {
    const rowKey = keyFor(propertyTier, serviceTier)
    setEarlyByKey((prev) => (prev ? { ...prev, [rowKey]: { ...prev[rowKey], ...patch } } : prev))
  }

  const pricingByTier = useMemo(() => {
    if (!pricingByKey) return null
    return Object.fromEntries(
      TIERS.map((t) => [
        t.id,
        {
          listing: pricingByKey[keyFor(t.id, 'listing')],
          managed: pricingByKey[keyFor(t.id, 'managed')],
        },
      ]),
    ) as Record<TierId, Record<ServiceTierId, PricingConfigRow>>
  }, [pricingByKey])

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

      {loading || !pricingByTier || !baselineByKey || !earlyByKey ? (
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
                const managedRow = pricingByTier[tier.id].managed
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
                      <div className="text-sm font-medium text-gray-900">{tier.display}</div>
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

                      <div className="space-y-3">
                        {SERVICE_TIERS.map((serviceTier) => {
                          const f = pricingByTier[tier.id][serviceTier]
                          return (
                            <div key={serviceTier} className="rounded-lg border border-gray-200 p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                {serviceTier === 'listing' ? 'Listing tier ($99 fixed)' : 'Managed tier (7% default)'}
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                  Landlord fee mode
                                </label>
                                <select
                                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                                  value={f.fee_mode}
                                  onChange={(e) =>
                                    updatePricingField(tier.id, serviceTier, 'fee_mode', e.target.value)
                                  }
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="percent">Percent</option>
                                </select>
                              </div>
                              {f.fee_mode === 'fixed' ? (
                                <div className="mt-2">
                                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                    Landlord fee ($)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                                    value={fixedFeeInputs?.[keyFor(tier.id, serviceTier)]?.feeFixedInput ?? centsToDollarsInput(f.fee_fixed_cents)}
                                    onChange={(e) =>
                                      updateFixedFeeInput(tier.id, serviceTier, 'fee', e.target.value)
                                    }
                                    onBlur={(e) =>
                                      commitFixedFeeInput(tier.id, serviceTier, 'fee', e.currentTarget.value)
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                    Landlord fee (%)
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                                    min={0}
                                    max={25}
                                    step={0.5}
                                    value={f.fee_percent}
                                    onChange={(e) =>
                                      updatePricingField(
                                        tier.id,
                                        serviceTier,
                                        'fee_percent',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                              )}
                              <div className="mt-2">
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                  Student booking fee ($)
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] text-gray-900"
                                  value={fixedFeeInputs?.[keyFor(tier.id, serviceTier)]?.studentFeeFixedInput ?? centsToDollarsInput(f.student_fee_fixed_cents)}
                                  onChange={(e) =>
                                    updateFixedFeeInput(tier.id, serviceTier, 'student', e.target.value)
                                  }
                                  onBlur={(e) =>
                                    commitFixedFeeInput(tier.id, serviceTier, 'student', e.currentTarget.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                disabled={savingTier === tier.id}
                                onClick={() => void onSaveTierFees(tier.id, serviceTier)}
                                className="mt-3 w-full rounded-md bg-[#1D9E75] py-1.5 text-xs font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
                              >
                                Save {serviceTier}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-800">Optional card surcharge (pass-through)</span>
                        <label className="relative inline-flex h-[18px] w-8 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={managedRow.card_surcharge_enabled}
                            onChange={(e) =>
                              updatePricingField(tier.id, 'managed', 'card_surcharge_enabled', e.target.checked)
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
                            checked={managedRow.free_transfer_required}
                            onChange={(e) =>
                              updatePricingField(tier.id, 'managed', 'free_transfer_required', e.target.checked)
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
                          value={managedRow.utilities_cap_aud}
                          onChange={(e) =>
                            updatePricingField(
                              tier.id,
                              'managed',
                              'utilities_cap_aud',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                        <p className="mt-0.5 text-[11px] text-gray-500">0 = not applicable / billed separately</p>
                      </div>

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
                Managed tier only. Listing is flat fee and does not combine with volume discounts.
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
                  {volumeRows.managed.map((v, i) => (
                    <tr key={v.id}>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          className="w-full min-w-[5rem] rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.label}
                          onChange={(e) => updateVolumeRow('managed', i, { label: e.target.value })}
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          type="number"
                          className="w-14 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.min_rooms}
                          onChange={(e) =>
                            updateVolumeRow('managed', i, { min_rooms: parseInt(e.target.value, 10) || 0 })
                          }
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          className="w-14 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={maxRoomsToInput(v.max_rooms)}
                          onChange={(e) =>
                            updateVolumeRow('managed', i, { max_rooms: parseMaxRoomsInput(e.target.value) })
                          }
                        />
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1">
                        <input
                          type="number"
                          step={0.5}
                          className="w-16 rounded border border-gray-300 bg-gray-50 px-1 py-0.5 text-xs"
                          value={v.discount_rate_pct}
                          onChange={(e) =>
                            updateVolumeRow('managed', i, { discount_rate_pct: parseFloat(e.target.value) || 0 })
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
                onClick={() => void onSaveVolume('managed')}
                className="mt-3 rounded-md bg-[#1D9E75] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
              >
                {savingVolume ? 'Saving…' : 'Save volume tiers'}
              </button>
            </div>
          )}

          {activeTab === 'early' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {TIERS.map((tier) => {
                const e = earlyByKey[keyFor(tier.id, 'managed')]
                const svc = pricingByTier[tier.id].managed.fee_percent
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
                            onChange={(ev) => updateEarly(tier.id, 'managed', { active: ev.target.checked })}
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
                          onChange={(ev) =>
                            updateEarly(tier.id, 'managed', { type: ev.target.value as EarlyAdopterUi['type'] })
                          }
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
                            onChange={(ev) =>
                              updateEarly(tier.id, 'managed', { value: parseFloat(ev.target.value) || 0 })
                            }
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
                          onChange={(ev) =>
                            updateEarly(tier.id, 'managed', { expiry: ev.target.value as EarlyAdopterUi['expiry'] })
                          }
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
                            onChange={(ev) => updateEarly(tier.id, 'managed', { expiryDate: ev.target.value })}
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
                            onChange={(ev) =>
                              updateEarly(tier.id, 'managed', { expiryCount: parseInt(ev.target.value, 10) || 1 })
                            }
                          />
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            Early adopter pricing ends after this many landlords sign up
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={savingTier === tier.id}
                        onClick={() => void onSaveEarly(tier.id, 'managed')}
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
                        {tierDisplayFromId(l.tier) + (l.service_tier ? `/${l.service_tier}` : '')}
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
