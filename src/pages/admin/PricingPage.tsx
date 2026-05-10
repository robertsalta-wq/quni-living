import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type {
  TierId,
  ServiceTierId,
  PricingKey,
  PricingConfigRow,
  VolumeTierRow,
  ChangeLogRow,
  EarlyAdopterUi,
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
import { Button, Card, EmptyState, Eyebrow, ErrorState, LoadingState, Pill } from '../../components/admin/primitives'
import { Icon } from '../../components/admin/Icon'
import { Tabs } from '../../components/admin/patterns'

type TabId = 'fees' | 'volume' | 'early' | 'log'

interface TierMeta {
  id: TierId
  label: string
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
    label: 'Tier 1 — Hosted Room',
    sub: 'Landlord lives on-site',
    legal: 'Boarder/lodger — RTA does not apply',
    doc: 'Custom Quni Occupancy Agreement',
    bond: 'Held by landlord — no RBO required',
    status: 'live',
    statusLabel: 'Live — Phase 1',
  },
  {
    id: 't2',
    label: 'Tier 2 — Private Room',
    sub: 'Landlord does not live on-site',
    legal: 'Residential Tenancies Act 2010 (NSW)',
    doc: 'Prescribed form FT6600 + Quni Addendum',
    bond: 'Lodged via NSW Fair Trading RBO — mandatory',
    status: 'live',
    statusLabel: 'Live — Phase 1',
  },
  {
    id: 't3',
    label: 'Tier 3 — Boarding House',
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

const SERVICE_TIERS: ServiceTierId[] = ['listing', 'managed']

function statusTone(s: TierMeta['status']): 'success' | 'info' | 'neutral' {
  if (s === 'live') return 'success'
  if (s === 'phase2') return 'info'
  return 'neutral'
}

function keyFor(p: TierId, s: ServiceTierId): PricingKey {
  return `${p}:${s}`
}

function centsToDollars(cents: number): string {
  return (Number(cents || 0) / 100).toFixed(2)
}

function parseDollarsToCents(raw: string): number | null {
  const normalized = raw.replace(/\$/g, '').replace(/,/g, '').trim()
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
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

function fmtNowAu(): string {
  const d = new Date()
  const date = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function formatLogTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return (
    d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  )
}

const FIELD_LABELS: Record<string, string> = {
  fee_mode: 'Fee mode',
  fee_percent: 'Fee %',
  fee_fixed_cents: 'Fixed fee ($)',
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

function logFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  if (field.startsWith('volume_discount_tiers.')) {
    const rest = field.replace(/^volume_discount_tiers\.[^.]+\./, '')
    return `Volume · ${rest}`
  }
  return field
}

function tierLabelShort(t: string | null): string {
  if (t === 't1') return 'T1'
  if (t === 't2') return 'T2'
  if (t === 't3') return 'T3'
  return '—'
}

function svcLabelShort(s: string | null): string {
  if (s === 'listing') return 'Listing'
  if (s === 'managed') return 'Managed'
  return ''
}

function isPricingDirty(
  a: Record<PricingKey, PricingConfigRow> | null,
  b: Record<PricingKey, PricingConfigRow> | null,
): boolean {
  if (!a || !b) return false
  for (const k of Object.keys(a) as PricingKey[]) {
    const ra = a[k]
    const rb = b[k]
    if (!rb) return true
    if (
      ra.fee_mode !== rb.fee_mode ||
      ra.fee_percent !== rb.fee_percent ||
      ra.fee_fixed_cents !== rb.fee_fixed_cents ||
      ra.student_fee_mode !== rb.student_fee_mode ||
      ra.student_fee_percent !== rb.student_fee_percent ||
      ra.student_fee_fixed_cents !== rb.student_fee_fixed_cents ||
      ra.card_surcharge_enabled !== rb.card_surcharge_enabled ||
      ra.free_transfer_required !== rb.free_transfer_required ||
      ra.utilities_cap_aud !== rb.utilities_cap_aud ||
      ra.early_adopter_active !== rb.early_adopter_active ||
      ra.early_adopter_type !== rb.early_adopter_type ||
      ra.early_adopter_value !== rb.early_adopter_value ||
      ra.early_adopter_expiry_type !== rb.early_adopter_expiry_type ||
      ra.early_adopter_expiry_date !== rb.early_adopter_expiry_date ||
      ra.early_adopter_expiry_count !== rb.early_adopter_expiry_count
    ) {
      return true
    }
  }
  return false
}

/** ===== Inline form primitives — co-located until reuse outside Pricing. ===== */

interface FormSectionProps {
  title: string
  subtitle?: string
  last?: boolean
  children: ReactNode
}
function FormSection({ title, subtitle, last, children }: FormSectionProps) {
  return (
    <div className={'px-6 py-5 ' + (last ? '' : 'border-b border-admin-line-soft')}>
      <div className="mb-3">
        <h3 className="m-0 text-[14px] font-semibold text-admin-ink">{title}</h3>
        {subtitle ? <p className="m-0 mt-0.5 text-[12px] text-admin-ink-4">{subtitle}</p> : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

interface FormRowProps {
  label: string
  hint?: string
  children: ReactNode
}
function FormRow({ label, hint, children }: FormRowProps) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-6">
      <div className="pt-1.5">
        <p className="m-0 text-[12px] font-medium text-admin-ink-2">{label}</p>
        {hint ? <p className="m-0 mt-0.5 text-[11px] leading-snug text-admin-ink-5">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

interface CurrencyInputProps {
  value: string
  onChange: (next: string) => void
  onBlur?: (raw: string) => void
  placeholder?: string
  disabled?: boolean
}
function CurrencyInput({ value, onChange, onBlur, placeholder, disabled }: CurrencyInputProps) {
  return (
    <div
      className={
        'flex max-w-[220px] items-center gap-1.5 rounded-admin-md border border-admin-line bg-white px-3 py-2 ' +
        (disabled ? 'opacity-60' : '')
      }
    >
      <span className="text-[13px] text-admin-ink-5">$</span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.currentTarget.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-[13px] text-admin-ink tabular-nums outline-none"
      />
      <span className="text-[11px] font-semibold tracking-[0.06em] text-admin-ink-5">AUD</span>
    </div>
  )
}

interface PercentInputProps {
  value: number
  onChange: (next: number) => void
  step?: number
  max?: number
  disabled?: boolean
}
function PercentInput({ value, onChange, step = 0.5, max = 100, disabled }: PercentInputProps) {
  return (
    <div
      className={
        'flex max-w-[160px] items-center gap-1.5 rounded-admin-md border border-admin-line bg-white px-3 py-2 ' +
        (disabled ? 'opacity-60' : '')
      }
    >
      <input
        type="number"
        min={0}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border-0 bg-transparent text-[13px] text-admin-ink tabular-nums outline-none"
      />
      <span className="text-[12px] font-semibold text-admin-ink-5">%</span>
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (next: T) => void
}
function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-admin-md border border-admin-line bg-admin-surface-2 p-[3px]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              'rounded-[7px] border-0 px-3.5 py-1 text-[12px] font-semibold transition-colors ' +
              (active ? 'bg-white text-admin-ink shadow-admin-card' : 'bg-transparent text-admin-ink-4 hover:text-admin-ink-2')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel?: string
}
function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors ' +
        (checked ? 'bg-admin-coral' : 'bg-admin-line')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-admin-card transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        }
      />
    </button>
  )
}

interface SelectProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (next: T) => void
  disabled?: boolean
}
function Select<T extends string>({ value, options, onChange, disabled }: SelectProps<T>) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="max-w-[260px] rounded-admin-md border border-admin-line bg-white px-3 py-2 text-[13px] text-admin-ink outline-none disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface NumberInputProps {
  value: number
  onChange: (next: number) => void
  min?: number
  step?: number
  suffix?: string
  maxWidth?: number
}
function NumberInput({ value, onChange, min = 0, step = 1, suffix, maxWidth = 180 }: NumberInputProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-admin-md border border-admin-line bg-white px-3 py-2"
      style={{ maxWidth }}
    >
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border-0 bg-transparent text-[13px] text-admin-ink tabular-nums outline-none"
      />
      {suffix ? <span className="text-[11px] font-semibold text-admin-ink-5">{suffix}</span> : null}
    </div>
  )
}

interface TextInputProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}
function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-[260px] rounded-admin-md border border-admin-line bg-white px-3 py-2 text-[13px] text-admin-ink outline-none"
    />
  )
}

interface DateInputProps {
  value: string
  onChange: (next: string) => void
}
function DateInput({ value, onChange }: DateInputProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[200px] rounded-admin-md border border-admin-line bg-white px-3 py-2 text-[13px] text-admin-ink outline-none"
    />
  )
}

/** ===== Page ===== */

type FixedFeeDraft = Record<PricingKey, { feeFixedInput: string; studentFeeFixedInput: string }>

function buildDraft(by: Record<PricingKey, PricingConfigRow>): FixedFeeDraft {
  return Object.fromEntries(
    Object.entries(by).map(([k, r]) => [
      k,
      {
        feeFixedInput: centsToDollars(r.fee_fixed_cents),
        studentFeeFixedInput: centsToDollars(r.student_fee_fixed_cents),
      },
    ]),
  ) as FixedFeeDraft
}

function cloneVolume(rows: VolumeTierRow[]): VolumeTierRow[] {
  return rows.map((r) => ({ ...r }))
}

function clonePricing(m: Record<PricingKey, PricingConfigRow>): Record<PricingKey, PricingConfigRow> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v }])) as Record<PricingKey, PricingConfigRow>
}

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('fees')
  const [pricingByKey, setPricingByKey] = useState<Record<PricingKey, PricingConfigRow> | null>(null)
  const [baselineByKey, setBaselineByKey] = useState<Record<PricingKey, PricingConfigRow> | null>(null)
  const [volumeRows, setVolumeRows] = useState<Record<ServiceTierId, VolumeTierRow[]>>({ listing: [], managed: [] })
  const [baselineVolumeRows, setBaselineVolumeRows] = useState<Record<ServiceTierId, VolumeTierRow[]>>({
    listing: [],
    managed: [],
  })
  const [earlyByKey, setEarlyByKey] = useState<Record<PricingKey, EarlyAdopterUi> | null>(null)
  const [changeLog, setChangeLog] = useState<ChangeLogRow[]>([])
  const [feeDraft, setFeeDraft] = useState<FixedFeeDraft | null>(null)
  const feeDraftRef = useRef<FixedFeeDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [previewTier, setPreviewTier] = useState<TierId>('t1')
  const [previewSvc, setPreviewSvc] = useState<ServiceTierId>('listing')

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
      setPricingByKey(clonePricing(bundle.pricingByKey))
      setBaselineByKey(clonePricing(bundle.pricingByKey))
      const draft = buildDraft(bundle.pricingByKey)
      feeDraftRef.current = draft
      setFeeDraft(draft)
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
    return data.user?.email?.trim() || data.user?.id || 'unknown'
  }, [])

  async function refreshLog() {
    try {
      setChangeLog(await refreshChangeLog(supabase))
    } catch {
      /* non-fatal */
    }
  }

  function setPricingField<K extends keyof PricingConfigRow>(
    pt: TierId,
    st: ServiceTierId,
    key: K,
    value: PricingConfigRow[K],
  ) {
    const rowKey = keyFor(pt, st)
    setPricingByKey((prev) => (prev ? { ...prev, [rowKey]: { ...prev[rowKey], [key]: value } } : prev))
  }

  function setEarlyField(pt: TierId, st: ServiceTierId, patch: Partial<EarlyAdopterUi>) {
    const rowKey = keyFor(pt, st)
    setEarlyByKey((prev) => (prev ? { ...prev, [rowKey]: { ...prev[rowKey], ...patch } } : prev))
  }

  function setFeeDraftField(pt: TierId, st: ServiceTierId, field: 'fee' | 'student', value: string) {
    const rowKey = keyFor(pt, st)
    setFeeDraft((prev) => {
      if (!prev) return prev
      const curr = prev[rowKey] ?? { feeFixedInput: '0.00', studentFeeFixedInput: '0.00' }
      const next: FixedFeeDraft = {
        ...prev,
        [rowKey]:
          field === 'fee'
            ? { ...curr, feeFixedInput: value }
            : { ...curr, studentFeeFixedInput: value },
      }
      feeDraftRef.current = next
      return next
    })
  }

  function commitFee(pt: TierId, st: ServiceTierId, field: 'fee' | 'student', rawOverride?: string) {
    if (!pricingByKey) return
    const rowKey = keyFor(pt, st)
    const draft = feeDraftRef.current
    const raw =
      rawOverride ??
      (field === 'fee' ? draft?.[rowKey]?.feeFixedInput : draft?.[rowKey]?.studentFeeFixedInput) ??
      ''
    const parsed = parseDollarsToCents(raw)
    const existing = pricingByKey[rowKey]
    const fallback = field === 'fee' ? existing.fee_fixed_cents : existing.student_fee_fixed_cents
    const nextCents = parsed == null ? fallback : parsed
    if (field === 'fee') setPricingField(pt, st, 'fee_fixed_cents', nextCents)
    else setPricingField(pt, st, 'student_fee_fixed_cents', nextCents)
    setFeeDraft((prev) => {
      if (!prev) return prev
      const curr = prev[rowKey] ?? { feeFixedInput: '0.00', studentFeeFixedInput: '0.00' }
      const next: FixedFeeDraft = {
        ...prev,
        [rowKey]:
          field === 'fee'
            ? { ...curr, feeFixedInput: centsToDollars(nextCents) }
            : { ...curr, studentFeeFixedInput: centsToDollars(nextCents) },
      }
      feeDraftRef.current = next
      return next
    })
  }

  async function saveTier(pt: TierId, st: ServiceTierId) {
    if (!pricingByKey || !baselineByKey) return
    const rowKey = keyFor(pt, st)
    setSavingKey(rowKey)
    setError(null)
    try {
      const by = await changedBy()
      const prev = baselineByKey[rowKey]
      const draft = feeDraftRef.current
      const fixedRaw = draft?.[rowKey]?.feeFixedInput ?? centsToDollars(prev.fee_fixed_cents)
      const studentRaw = draft?.[rowKey]?.studentFeeFixedInput ?? centsToDollars(prev.student_fee_fixed_cents)
      const parsedFixed = parseDollarsToCents(fixedRaw)
      const parsedStudent = parseDollarsToCents(studentRaw)
      const p: PricingConfigRow = {
        ...pricingByKey[rowKey],
        fee_fixed_cents: parsedFixed ?? prev.fee_fixed_cents,
        student_fee_fixed_cents: parsedStudent ?? prev.student_fee_fixed_cents,
      }
      const updated = await savePricingFeeFields(
        supabase,
        pt,
        st,
        prev,
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
      setPricingByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: updated } : prev2))
      setBaselineByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: updated } : prev2))
      setEarlyByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: earlyUiFromRow(updated) } : prev2))
      setFeeDraft((prev2) => {
        if (!prev2) return prev2
        const next: FixedFeeDraft = {
          ...prev2,
          [rowKey]: {
            feeFixedInput: centsToDollars(updated.fee_fixed_cents),
            studentFeeFixedInput: centsToDollars(updated.student_fee_fixed_cents),
          },
        }
        feeDraftRef.current = next
        return next
      })
      setLastSaved(fmtNowAu())
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveEarly(pt: TierId) {
    if (!pricingByKey || !baselineByKey || !earlyByKey) return
    const st: ServiceTierId = 'managed'
    const rowKey = keyFor(pt, st)
    setSavingKey(rowKey + ':early')
    setError(null)
    try {
      const by = await changedBy()
      const prev = baselineByKey[rowKey]
      const ui = earlyByKey[rowKey]
      const updated = await savePricingEarlyFields(supabase, pt, st, prev, ui, by, pricingByKey[rowKey].fee_percent)
      setPricingByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: updated } : prev2))
      setBaselineByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: updated } : prev2))
      setEarlyByKey((prev2) => (prev2 ? { ...prev2, [rowKey]: earlyUiFromRow(updated) } : prev2))
      setLastSaved(fmtNowAu())
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveVolume() {
    setSavingKey('volume')
    setError(null)
    try {
      const by = await changedBy()
      const next = await saveVolumeDiscountTiers(supabase, 'managed', baselineVolumeRows.managed, volumeRows.managed, by)
      setVolumeRows((prev) => ({ ...prev, managed: cloneVolume(next) }))
      setBaselineVolumeRows((prev) => ({ ...prev, managed: cloneVolume(next) }))
      setLastSaved(fmtNowAu())
      await refreshLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  function discardAll() {
    if (!baselineByKey) return
    setPricingByKey(clonePricing(baselineByKey))
    const early = Object.fromEntries(
      Object.entries(baselineByKey).map(([k, v]) => [k, earlyUiFromRow(v)]),
    ) as Record<PricingKey, EarlyAdopterUi>
    setEarlyByKey(early)
    setVolumeRows({
      listing: cloneVolume(baselineVolumeRows.listing),
      managed: cloneVolume(baselineVolumeRows.managed),
    })
    const draft = buildDraft(baselineByKey)
    feeDraftRef.current = draft
    setFeeDraft(draft)
  }

  const dirty = useMemo(() => isPricingDirty(pricingByKey, baselineByKey), [pricingByKey, baselineByKey])

  const previewRow = pricingByKey?.[keyFor(previewTier, previewSvc)] ?? null
  const previewBaseline = baselineByKey?.[keyFor(previewTier, previewSvc)] ?? null
  const previewDirty = useMemo(() => {
    if (!previewRow || !previewBaseline) return false
    return (
      previewRow.fee_mode !== previewBaseline.fee_mode ||
      previewRow.fee_percent !== previewBaseline.fee_percent ||
      previewRow.fee_fixed_cents !== previewBaseline.fee_fixed_cents ||
      previewRow.student_fee_fixed_cents !== previewBaseline.student_fee_fixed_cents
    )
  }, [previewRow, previewBaseline])

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-6">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <Pill tone="success" dot="ok">
              LIVE · PHASE 1
            </Pill>
            <span className="text-[12px] text-admin-ink-5">
              {lastSaved ? <>Last saved <span className="tabular-nums">{lastSaved}</span></> : 'No changes saved this session'}
            </span>
          </div>
          <h1 className="m-0 text-[28px] font-bold tracking-tight text-admin-ink">Pricing</h1>
          <p className="m-0 mt-1 text-[14px] text-admin-ink-4">
            Service tier configuration · all changes are date / time stamped.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button kind="ghost" size="md" disabled={!dirty} onClick={discardAll}>
            Discard
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-admin-md border border-admin-danger-bg bg-admin-danger-bg/40 px-3 py-2 text-[13px] text-admin-danger-fg">
          {error}
        </div>
      ) : null}

      {loading || !pricingByKey || !baselineByKey || !earlyByKey || !feeDraft ? (
        <Card>
          <LoadingState label="Loading pricing…" />
        </Card>
      ) : (
        <>
          <div className="mt-4 mb-6">
            <Tabs<TabId>
              ariaLabel="Pricing sections"
              active={activeTab}
              onChange={setActiveTab}
              items={[
                { id: 'fees', label: 'Fees', sub: 'Listing & Managed' },
                { id: 'volume', label: 'Volume', sub: 'Managed only' },
                { id: 'early', label: 'Early adopter' },
                { id: 'log', label: 'Change log', count: changeLog.length },
              ]}
            />
          </div>

          {activeTab === 'fees' ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="flex flex-col gap-4">
                {TIERS.map((tier) => (
                  <FeesCard
                    key={tier.id}
                    tier={tier}
                    pricingByKey={pricingByKey}
                    baselineByKey={baselineByKey}
                    feeDraft={feeDraft}
                    setPricingField={setPricingField}
                    setFeeDraftField={setFeeDraftField}
                    commitFee={commitFee}
                    saveTier={saveTier}
                    savingKey={savingKey}
                  />
                ))}
              </div>
              <LivePreview
                previewTier={previewTier}
                previewSvc={previewSvc}
                onPreviewTier={setPreviewTier}
                onPreviewSvc={setPreviewSvc}
                row={previewRow}
                dirty={previewDirty}
              />
            </div>
          ) : null}

          {activeTab === 'volume' ? (
            <Card padding={0}>
              <FormSection title="Volume discount tiers" subtitle="Managed tier only. Listing is flat fee and does not combine with volume discounts.">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-admin-surface-2">
                        {['Tier label', 'Min rooms', 'Max rooms', 'Service fee %'].map((h) => (
                          <th
                            key={h}
                            className="border-b border-admin-line px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {volumeRows.managed.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-admin-ink-5">
                            No volume tiers configured yet.
                          </td>
                        </tr>
                      ) : (
                        volumeRows.managed.map((v, i) => (
                          <tr key={v.id} className={i % 2 === 1 ? 'bg-admin-surface-2' : 'bg-white'}>
                            <td className="border-b border-admin-line-soft px-3.5 py-2.5">
                              <TextInput
                                value={v.label}
                                onChange={(next) =>
                                  setVolumeRows((rows) => {
                                    const out = [...rows.managed]
                                    out[i] = { ...out[i], label: next }
                                    return { ...rows, managed: out }
                                  })
                                }
                              />
                            </td>
                            <td className="border-b border-admin-line-soft px-3.5 py-2.5">
                              <NumberInput
                                value={v.min_rooms}
                                onChange={(n) =>
                                  setVolumeRows((rows) => {
                                    const out = [...rows.managed]
                                    out[i] = { ...out[i], min_rooms: n }
                                    return { ...rows, managed: out }
                                  })
                                }
                                maxWidth={120}
                              />
                            </td>
                            <td className="border-b border-admin-line-soft px-3.5 py-2.5">
                              <TextInput
                                value={maxRoomsToInput(v.max_rooms)}
                                onChange={(raw) =>
                                  setVolumeRows((rows) => {
                                    const out = [...rows.managed]
                                    out[i] = { ...out[i], max_rooms: parseMaxRoomsInput(raw) }
                                    return { ...rows, managed: out }
                                  })
                                }
                              />
                            </td>
                            <td className="border-b border-admin-line-soft px-3.5 py-2.5">
                              <PercentInput
                                value={v.discount_rate_pct}
                                step={0.5}
                                onChange={(n) =>
                                  setVolumeRows((rows) => {
                                    const out = [...rows.managed]
                                    out[i] = { ...out[i], discount_rate_pct: n }
                                    return { ...rows, managed: out }
                                  })
                                }
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pt-2">
                  <Button kind="primary" size="md" onClick={() => void saveVolume()} disabled={savingKey === 'volume'}>
                    {savingKey === 'volume' ? 'Saving…' : 'Save volume tiers'}
                  </Button>
                </div>
              </FormSection>
            </Card>
          ) : null}

          {activeTab === 'early' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {TIERS.map((tier) => (
                <EarlyAdopterCard
                  key={tier.id}
                  tier={tier}
                  earlyByKey={earlyByKey}
                  pricingByKey={pricingByKey}
                  setEarlyField={setEarlyField}
                  saveEarly={saveEarly}
                  savingKey={savingKey}
                />
              ))}
            </div>
          ) : null}

          {activeTab === 'log' ? (
            <Card padding={0}>
              {changeLog.length === 0 ? (
                <div className="px-6 py-10">
                  <EmptyState
                    icon="file-text"
                    title="No changes recorded yet"
                    description="Edit any fee field and save. Every change is appended here with a timestamp and author."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-admin-surface-2">
                        {['Date', 'Field', 'Tier', 'Old value', 'New value', 'Author'].map((h) => (
                          <th
                            key={h}
                            className="border-b border-admin-line px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {changeLog.map((l, i) => (
                        <tr key={l.id} className={i === changeLog.length - 1 ? '' : 'border-b border-admin-line-soft'}>
                          <td className="px-3.5 py-2.5 align-middle text-admin-ink-3 tabular-nums whitespace-nowrap">
                            {formatLogTs(l.changed_at)}
                          </td>
                          <td className="px-3.5 py-2.5 align-middle text-admin-ink-2">{logFieldLabel(l.field_name)}</td>
                          <td className="px-3.5 py-2.5 align-middle text-admin-ink-3">
                            <span className="inline-flex items-center gap-1.5 rounded-admin-sm bg-admin-surface-3 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-admin-ink-3">
                              {tierLabelShort(l.tier)}
                              {l.service_tier ? <span className="text-admin-ink-5">/{svcLabelShort(l.service_tier)}</span> : null}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 align-middle">
                            <DiffChip value={formatLogValue(l.old_value)} kind="old" />
                          </td>
                          <td className="px-3.5 py-2.5 align-middle">
                            <DiffChip value={formatLogValue(l.new_value)} kind="new" />
                          </td>
                          <td className="px-3.5 py-2.5 align-middle">
                            <AuthorCell name={l.changed_by ?? 'unknown'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}
        </>
      )}

      {!loading && error ? (
        <div className="mt-4">
          <ErrorState
            title="Pricing data could not be loaded"
            description={error}
            onRetry={() => void load()}
            retryLabel="Reload"
          />
        </div>
      ) : null}
    </div>
  )
}

/** ===== Sub-components ===== */

interface FeesCardProps {
  tier: TierMeta
  pricingByKey: Record<PricingKey, PricingConfigRow>
  baselineByKey: Record<PricingKey, PricingConfigRow>
  feeDraft: FixedFeeDraft
  setPricingField: <K extends keyof PricingConfigRow>(pt: TierId, st: ServiceTierId, key: K, value: PricingConfigRow[K]) => void
  setFeeDraftField: (pt: TierId, st: ServiceTierId, field: 'fee' | 'student', value: string) => void
  commitFee: (pt: TierId, st: ServiceTierId, field: 'fee' | 'student', raw?: string) => void
  saveTier: (pt: TierId, st: ServiceTierId) => void | Promise<void>
  savingKey: string | null
}

function FeesCard({
  tier,
  pricingByKey,
  baselineByKey,
  feeDraft,
  setPricingField,
  setFeeDraftField,
  commitFee,
  saveTier,
  savingKey,
}: FeesCardProps) {
  const managed = pricingByKey[keyFor(tier.id, 'managed')]
  return (
    <Card padding={0}>
      <div className="flex items-start justify-between gap-3 border-b border-admin-line-soft px-6 py-4">
        <div>
          <h3 className="m-0 text-[15px] font-semibold text-admin-ink">{tier.label}</h3>
          <p className="m-0 mt-0.5 text-[12px] text-admin-ink-4">{tier.sub}</p>
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-admin-ink-4 sm:grid-cols-3">
            <KvMini k="Legal" v={tier.legal} />
            <KvMini k="Document" v={tier.doc} />
            <KvMini k="Bond" v={tier.bond} />
          </div>
        </div>
        <Pill tone={statusTone(tier.status)} dot={tier.status === 'live' ? 'ok' : tier.status === 'phase2' ? 'watch' : undefined}>
          {tier.statusLabel}
        </Pill>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
        {SERVICE_TIERS.map((st) => {
          const f = pricingByKey[keyFor(tier.id, st)]
          const baseline = baselineByKey[keyFor(tier.id, st)]
          const draft = feeDraft[keyFor(tier.id, st)]
          const isDirty =
            f.fee_mode !== baseline.fee_mode ||
            f.fee_percent !== baseline.fee_percent ||
            f.fee_fixed_cents !== baseline.fee_fixed_cents ||
            f.student_fee_fixed_cents !== baseline.student_fee_fixed_cents
          const isSaving = savingKey === keyFor(tier.id, st)
          return (
            <div key={st} className="rounded-admin-md border border-admin-line bg-admin-surface-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-admin-ink-3">
                  {st === 'listing' ? 'Listing tier' : 'Managed tier'}
                </p>
                {isDirty ? <Pill tone="warning">Unsaved</Pill> : null}
              </div>
              <div className="flex flex-col gap-3">
                <FormRow label="Fee model">
                  <Segmented
                    value={f.fee_mode === 'fixed' ? 'fixed' : 'percent'}
                    options={[
                      { value: 'fixed', label: 'Flat fee' },
                      { value: 'percent', label: 'Percentage' },
                    ]}
                    onChange={(v) => setPricingField(tier.id, st, 'fee_mode', v)}
                  />
                </FormRow>
                {f.fee_mode === 'fixed' ? (
                  <FormRow label="Fee amount">
                    <CurrencyInput
                      value={draft.feeFixedInput}
                      onChange={(v) => setFeeDraftField(tier.id, st, 'fee', v)}
                      onBlur={(raw) => commitFee(tier.id, st, 'fee', raw)}
                    />
                  </FormRow>
                ) : (
                  <FormRow label="Fee percentage">
                    <PercentInput
                      value={f.fee_percent}
                      max={25}
                      onChange={(n) => setPricingField(tier.id, st, 'fee_percent', n)}
                    />
                  </FormRow>
                )}
                <FormRow label="Student booking fee" hint="Charged to the student at booking time.">
                  <CurrencyInput
                    value={draft.studentFeeFixedInput}
                    onChange={(v) => setFeeDraftField(tier.id, st, 'student', v)}
                    onBlur={(raw) => commitFee(tier.id, st, 'student', raw)}
                  />
                </FormRow>
              </div>
              <div className="mt-4">
                <Button
                  kind="primary"
                  size="sm"
                  disabled={isSaving || !isDirty}
                  onClick={() => void saveTier(tier.id, st)}
                >
                  {isSaving ? 'Saving…' : isDirty ? `Save ${st}` : 'Saved'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-admin-line-soft px-6 py-5">
        <h4 className="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">
          Shared payment settings
        </h4>
        <p className="m-0 mt-0.5 text-[12px] italic text-admin-ink-5">{TIER_PAYMENT_NOTES[tier.id]}</p>
        <div className="mt-3 flex flex-col gap-3">
          <FormRow label="Card surcharge" hint="Optional 1.7% pass-through if the student pays by card.">
            <Toggle
              checked={managed.card_surcharge_enabled}
              onChange={(next) => setPricingField(tier.id, 'managed', 'card_surcharge_enabled', next)}
              ariaLabel="Card surcharge enabled"
            />
          </FormRow>
          <FormRow label="Free bank transfer" hint="When on, bank transfer is always offered with no surcharge.">
            <Toggle
              checked={managed.free_transfer_required}
              onChange={(next) => setPricingField(tier.id, 'managed', 'free_transfer_required', next)}
              ariaLabel="Free bank transfer required"
            />
          </FormRow>
          <FormRow label="Utilities cap" hint="Quarterly cap; 0 means not applicable / billed separately.">
            <NumberInput
              value={managed.utilities_cap_aud}
              min={0}
              step={50}
              suffix="AUD / quarter"
              onChange={(n) => setPricingField(tier.id, 'managed', 'utilities_cap_aud', n)}
            />
          </FormRow>
        </div>
      </div>
    </Card>
  )
}

function KvMini({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5">{k}</p>
      <p className="m-0 mt-0.5 text-[11px] leading-snug text-admin-ink-3">{v}</p>
    </div>
  )
}

interface EarlyAdopterCardProps {
  tier: TierMeta
  earlyByKey: Record<PricingKey, EarlyAdopterUi>
  pricingByKey: Record<PricingKey, PricingConfigRow>
  setEarlyField: (pt: TierId, st: ServiceTierId, patch: Partial<EarlyAdopterUi>) => void
  saveEarly: (pt: TierId) => void | Promise<void>
  savingKey: string | null
}

function EarlyAdopterCard({ tier, earlyByKey, pricingByKey, setEarlyField, saveEarly, savingKey }: EarlyAdopterCardProps) {
  const key = keyFor(tier.id, 'managed')
  const e = earlyByKey[key]
  const svc = pricingByKey[key].fee_percent
  const isSaving = savingKey === key + ':early'
  const effective =
    e.type === 'percent' ? `Effective rate: ${(svc * (1 - e.value / 100)).toFixed(1)}% (vs ${svc}% standard)` : null
  return (
    <Card padding={0}>
      <div className="border-b border-admin-line-soft px-5 py-4">
        <h3 className="m-0 text-[14px] font-semibold text-admin-ink">{tier.label}</h3>
        <p className="m-0 mt-0.5 text-[12px] text-admin-ink-4">Early adopter pricing (Managed only)</p>
      </div>
      <div className="flex flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[13px] font-medium text-admin-ink-2">Enable early adopter pricing</p>
          <Toggle checked={e.active} onChange={(next) => setEarlyField(tier.id, 'managed', { active: next })} />
        </div>
        <FormRow label="Pricing type">
          <Select
            value={e.type}
            disabled={!e.active}
            onChange={(v) => setEarlyField(tier.id, 'managed', { type: v as EarlyAdopterUi['type'] })}
            options={[
              { value: 'free', label: 'Free (0%)' },
              { value: 'percent', label: '% discount off standard rate' },
              { value: 'fixed', label: 'Fixed reduced rate' },
            ]}
          />
        </FormRow>
        {e.type !== 'free' ? (
          <FormRow label={e.type === 'percent' ? 'Discount %' : 'Fixed rate %'} hint={effective ?? undefined}>
            <PercentInput
              value={e.value}
              disabled={!e.active}
              max={100}
              step={0.5}
              onChange={(n) => setEarlyField(tier.id, 'managed', { value: n })}
            />
          </FormRow>
        ) : (
          <p className="m-0 text-[12px] text-admin-ink-5">Landlord pays 0% — free listing period.</p>
        )}
        <FormRow label="Expiry">
          <Select
            value={e.expiry}
            disabled={!e.active}
            onChange={(v) => setEarlyField(tier.id, 'managed', { expiry: v as EarlyAdopterUi['expiry'] })}
            options={[
              { value: 'date', label: 'By date' },
              { value: 'count', label: 'By number of landlords' },
              { value: 'both', label: 'Whichever comes first' },
            ]}
          />
        </FormRow>
        {e.expiry !== 'count' ? (
          <FormRow label="Expiry date">
            <DateInput
              value={e.expiryDate}
              onChange={(v) => setEarlyField(tier.id, 'managed', { expiryDate: v })}
            />
          </FormRow>
        ) : null}
        {e.expiry !== 'date' ? (
          <FormRow label="Max landlords" hint="Early adopter pricing ends after this many landlords sign up.">
            <NumberInput
              value={e.expiryCount}
              min={1}
              onChange={(n) => setEarlyField(tier.id, 'managed', { expiryCount: Math.max(1, Math.round(n)) })}
            />
          </FormRow>
        ) : null}
        <div className="pt-2">
          <Button kind="primary" size="sm" onClick={() => void saveEarly(tier.id)} disabled={isSaving}>
            {isSaving ? 'Saving…' : `Save ${tier.label.split('—')[1]?.trim() ?? tier.label}`}
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface DiffChipProps {
  value: string
  kind: 'old' | 'new'
}
function DiffChip({ value, kind }: DiffChipProps) {
  if (!value) return <span className="text-admin-ink-5">—</span>
  const isOld = kind === 'old'
  return (
    <span
      className={
        'inline-flex max-w-[200px] truncate rounded-admin-sm px-1.5 py-0.5 font-mono text-[12px] ' +
        (isOld
          ? 'bg-admin-danger-bg text-admin-danger-fg line-through'
          : 'bg-admin-success-bg text-admin-success-fg')
      }
      title={value}
    >
      {value}
    </span>
  )
}

function AuthorCell({ name }: { name: string }) {
  const trimmed = name.trim()
  const initials =
    trimmed
      .split(/[@.\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-admin-surface-3 text-[9px] font-bold text-admin-ink-2">
        {initials}
      </span>
      <span className="text-[12px] text-admin-ink-3">{trimmed}</span>
    </span>
  )
}

interface LivePreviewProps {
  previewTier: TierId
  previewSvc: ServiceTierId
  onPreviewTier: (t: TierId) => void
  onPreviewSvc: (s: ServiceTierId) => void
  row: PricingConfigRow | null
  dirty: boolean
}
function LivePreview({ previewTier, previewSvc, onPreviewTier, onPreviewSvc, row, dirty }: LivePreviewProps) {
  return (
    <div className="sticky top-[88px] flex flex-col gap-3 self-start">
      <Card padding={0}>
        <div className="flex items-center justify-between gap-2 border-b border-admin-line-soft px-5 py-3.5">
          <div>
            <Eyebrow>Live preview</Eyebrow>
            <p className="m-0 mt-0.5 text-[12px] text-admin-ink-4">What a landlord sees today</p>
          </div>
          {dirty ? (
            <Pill tone="warning" dot="action">
              Unsaved
            </Pill>
          ) : (
            <Pill tone="navy" dot="ok">
              Synced
            </Pill>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-admin-line-soft px-5 py-3">
          <Segmented<ServiceTierId>
            value={previewSvc}
            onChange={onPreviewSvc}
            options={[
              { value: 'listing', label: 'Listing' },
              { value: 'managed', label: 'Managed' },
            ]}
          />
          <Segmented<TierId>
            value={previewTier}
            onChange={onPreviewTier}
            options={[
              { value: 't1', label: 'T1' },
              { value: 't2', label: 'T2' },
              { value: 't3', label: 'T3' },
            ]}
          />
        </div>

        {row ? <LandlordPreviewCard row={row} svc={previewSvc} tier={previewTier} /> : null}
      </Card>
      <p className="m-0 px-1 text-[11px] leading-snug text-admin-ink-5">
        Preview reflects unsaved changes. Public pricing page updates only after individual{' '}
        <strong className="text-admin-ink-3">Save</strong> actions complete.
      </p>
    </div>
  )
}

interface LandlordPreviewCardProps {
  row: PricingConfigRow
  svc: ServiceTierId
  tier: TierId
}
function LandlordPreviewCard({ row, svc, tier }: LandlordPreviewCardProps) {
  const isListing = svc === 'listing'
  const headline = isListing ? 'List it yourself.' : 'Let us manage.'
  const description = isListing
    ? 'Self-service listing tier. You manage enquiries, bookings and the tenancy agreement; we handle marketplace exposure and verification.'
    : 'Full-service tier. Quni handles enquiries, viewings, agreements, bond lodgement and payouts — you collect rent automatically.'
  const priceMain = row.fee_mode === 'fixed' ? `$${centsToDollars(row.fee_fixed_cents).replace(/\.00$/, '')}` : `${row.fee_percent}%`
  const priceSuffix = row.fee_mode === 'fixed' ? 'flat per booking · AUD' : 'of weekly rent · AUD'
  const studentFee = row.student_fee_fixed_cents > 0 ? `$${centsToDollars(row.student_fee_fixed_cents).replace(/\.00$/, '')} student booking fee` : 'No student booking fee'
  const features: string[] = [
    studentFee,
    row.free_transfer_required ? 'Free bank transfer always offered' : 'Card pay only',
    row.card_surcharge_enabled ? 'Card surcharge passes through to renter' : 'No card surcharge',
    row.utilities_cap_aud > 0 ? `Utilities capped at $${row.utilities_cap_aud} / quarter` : 'Utilities billed separately',
  ]
  return (
    <div className="px-5 py-5">
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-admin-coral-active">
        {svc === 'listing' ? 'Listing tier' : 'Managed tier'} · {tier.toUpperCase()}
      </p>
      <h3 className="m-0 mt-1.5 mb-1 text-[22px] font-bold tracking-tight text-admin-ink font-admin-display">{headline}</h3>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-admin-ink-3">{description}</p>

      <div className="mb-4 flex items-baseline gap-2 border-b border-admin-line-soft pb-4">
        <span className="font-admin-serif text-[40px] font-semibold leading-none tracking-tight text-admin-ink">{priceMain}</span>
        <span className="text-[12px] text-admin-ink-4">{priceSuffix}</span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {features.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-admin-ink-2">
            <span className="mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-admin-success-bg">
              <Icon name="check" size={10} className="text-admin-success-fg" />
            </span>
            {t}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="mt-5 w-full cursor-not-allowed rounded-admin-md bg-admin-coral px-3.5 py-2.5 text-[13px] font-semibold text-white opacity-90"
      >
        Choose {svc === 'listing' ? 'Listing' : 'Managed'} tier
      </button>
    </div>
  )
}
