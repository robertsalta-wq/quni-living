import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type TierId = 't1' | 't2' | 't3'
export type ServiceTierId = 'listing' | 'managed'
export type PricingKey = `${TierId}:${ServiceTierId}`

export type PricingConfigRow = Database['public']['Tables']['pricing_config']['Row']
export type VolumeTierRow = Database['public']['Tables']['volume_discount_tiers']['Row']
export type ChangeLogRow = Database['public']['Tables']['pricing_change_log']['Row']
export type ChangeLogInsert = Database['public']['Tables']['pricing_change_log']['Insert']

export type EarlyAdopterUi = {
  active: boolean
  type: 'free' | 'percent' | 'fixed'
  value: number
  expiry: 'date' | 'count' | 'both'
  expiryDate: string
  expiryCount: number
}

export type AdminPricingBundle = {
  pricingByKey: Record<PricingKey, PricingConfigRow>
  volumeTiersByService: Record<ServiceTierId, VolumeTierRow[]>
  changeLog: ChangeLogRow[]
}

const TIER_IDS: TierId[] = ['t1', 't2', 't3']
const SERVICE_TIER_IDS: ServiceTierId[] = ['listing', 'managed']

const FEE_KEYS = [
  'fee_mode',
  'fee_percent',
  'fee_fixed_cents',
  'student_fee_mode',
  'student_fee_percent',
  'student_fee_fixed_cents',
  'card_surcharge_enabled',
  'free_transfer_required',
  'utilities_cap_aud',
] as const satisfies readonly (keyof PricingConfigRow)[]

const EARLY_KEYS = [
  'early_adopter_active',
  'early_adopter_type',
  'early_adopter_value',
  'early_adopter_expiry_type',
  'early_adopter_expiry_date',
  'early_adopter_expiry_count',
] as const satisfies readonly (keyof PricingConfigRow)[]

export function formatLogValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

/** DB absolute % → UI discount % (early adopter type percent). */
export function absoluteToDiscountPct(svcFeePct: number, absolutePct: number | null): number {
  if (svcFeePct <= 0 || absolutePct == null) return 0
  const d = (1 - absolutePct / svcFeePct) * 100
  if (!Number.isFinite(d)) return 0
  return Math.round(d * 10) / 10
}

/** UI discount % → DB absolute % for early adopter type percent. */
export function discountToAbsolutePct(svcFeePct: number, discountPct: number): number {
  const v = svcFeePct * (1 - discountPct / 100)
  return Math.round(v * 100) / 100
}

export function earlyUiFromRow(row: PricingConfigRow): EarlyAdopterUi {
  const t = row.early_adopter_type
  const type: EarlyAdopterUi['type'] =
    t === 'free' || t === 'percent' || t === 'fixed' ? t : 'percent'

  let value = row.early_adopter_value ?? 0
  if (type === 'percent') {
    value = absoluteToDiscountPct(row.fee_percent, row.early_adopter_value)
  }
  if (type === 'free') {
    value = 0
  }

  const exp = row.early_adopter_expiry_type
  const expiry: EarlyAdopterUi['expiry'] =
    exp === 'date' || exp === 'count' || exp === 'both' ? exp : 'date'

  return {
    active: row.early_adopter_active,
    type,
    value,
    expiry,
    expiryDate: row.early_adopter_expiry_date?.slice(0, 10) ?? '',
    expiryCount: row.early_adopter_expiry_count ?? 1,
  }
}

export function earlyRowPatchFromUi(
  row: PricingConfigRow,
  ui: EarlyAdopterUi,
  svcFeePctForConversion: number = row.fee_percent,
): Partial<PricingConfigRow> {
  const svc = svcFeePctForConversion
  let earlyValue: number | null = null
  if (ui.type === 'free') {
    earlyValue = null
  } else if (ui.type === 'percent') {
    earlyValue = discountToAbsolutePct(svc, ui.value)
  } else {
    earlyValue = ui.value
  }

  return {
    early_adopter_active: ui.active,
    early_adopter_type: ui.type,
    early_adopter_value: earlyValue,
    early_adopter_expiry_type: ui.expiry,
    early_adopter_expiry_date:
      ui.expiry === 'count' ? null : ui.expiryDate.trim() ? ui.expiryDate.trim() : null,
    early_adopter_expiry_count: ui.expiry === 'date' ? null : ui.expiryCount,
  }
}

function pricingRecord(rows: PricingConfigRow[]): Record<PricingKey, PricingConfigRow> {
  const out = {} as Record<PricingKey, PricingConfigRow>
  for (const propertyTier of TIER_IDS) {
    for (const serviceTier of SERVICE_TIER_IDS) {
      const r = rows.find((x) => x.property_tier === propertyTier && x.service_tier === serviceTier)
      if (!r) throw new Error(`Missing pricing_config row for ${propertyTier}/${serviceTier}`)
      out[`${propertyTier}:${serviceTier}`] = r
    }
  }
  return out
}

export async function fetchAdminPricingBundle(
  supabase: SupabaseClient<Database>,
  logLimit = 500,
): Promise<AdminPricingBundle> {
  const [pc, volManaged, log] = await Promise.all([
    supabase.from('pricing_config').select('*').order('property_tier').order('service_tier'),
    supabase.from('volume_discount_tiers').select('*').eq('service_tier', 'managed').order('min_rooms'),
    supabase.from('pricing_change_log').select('*').order('changed_at', { ascending: false }).limit(logLimit),
  ])

  if (pc.error) throw pc.error
  if (volManaged.error) throw volManaged.error
  if (log.error) throw log.error

  const rows = (pc.data ?? []) as PricingConfigRow[]
  if (rows.length < 6) throw new Error('pricing_config must include t1/t2/t3 across listing and managed')

  return {
    pricingByKey: pricingRecord(rows),
    volumeTiersByService: {
      listing: [],
      managed: (volManaged.data ?? []) as VolumeTierRow[],
    },
    changeLog: (log.data ?? []) as ChangeLogRow[],
  }
}

async function insertChangeLogs(
  supabase: SupabaseClient<Database>,
  entries: ChangeLogInsert[],
): Promise<void> {
  if (entries.length === 0) return
  const { error } = await supabase.from('pricing_change_log').insert(entries)
  if (error) throw error
}

export async function savePricingFeeFields(
  supabase: SupabaseClient<Database>,
  propertyTier: TierId,
  serviceTier: ServiceTierId,
  prev: PricingConfigRow,
  next: {
    fee_mode: string
    fee_percent: number
    fee_fixed_cents: number
    student_fee_mode: string
    student_fee_percent: number
    student_fee_fixed_cents: number
    card_surcharge_enabled: boolean
    free_transfer_required: boolean
    utilities_cap_aud: number
  },
  changedBy: string,
): Promise<PricingConfigRow> {
  const patch: Partial<PricingConfigRow> = {
    ...next,
    updated_by: changedBy,
  }

  const logs: ChangeLogInsert[] = []
  for (const key of FEE_KEYS) {
    const before = prev[key]
    const after = patch[key] as PricingConfigRow[typeof key]
    if (formatLogValue(before) !== formatLogValue(after)) {
      logs.push({
        tier: propertyTier,
        service_tier: serviceTier,
        field_name: key,
        old_value: formatLogValue(before),
        new_value: formatLogValue(after),
        changed_by: changedBy,
      })
    }
  }

  if (logs.length === 0) {
    return prev
  }

  const { data, error } = await supabase
    .from('pricing_config')
    .update(patch)
    .eq('id', prev.id)
    .select('*')
    .single()

  if (error) throw error
  await insertChangeLogs(supabase, logs)
  return data as PricingConfigRow
}

export async function savePricingEarlyFields(
  supabase: SupabaseClient<Database>,
  propertyTier: TierId,
  serviceTier: ServiceTierId,
  prev: PricingConfigRow,
  ui: EarlyAdopterUi,
  changedBy: string,
  svcFeePctForConversion: number = prev.fee_percent,
): Promise<PricingConfigRow> {
  const earlyPatch = earlyRowPatchFromUi(prev, ui, svcFeePctForConversion)
  const patch: Partial<PricingConfigRow> = {
    ...earlyPatch,
    updated_by: changedBy,
  }

  const logs: ChangeLogInsert[] = []
  for (const key of EARLY_KEYS) {
    const before = prev[key]
    const after = patch[key] as PricingConfigRow[typeof key]
    if (formatLogValue(before) !== formatLogValue(after)) {
      logs.push({
        tier: propertyTier,
        service_tier: serviceTier,
        field_name: key,
        old_value: formatLogValue(before),
        new_value: formatLogValue(after),
        changed_by: changedBy,
      })
    }
  }

  if (logs.length === 0) {
    return prev
  }

  const { data, error } = await supabase
    .from('pricing_config')
    .update(patch)
    .eq('id', prev.id)
    .select('*')
    .single()

  if (error) throw error
  await insertChangeLogs(supabase, logs)
  return data as PricingConfigRow
}

const VOLUME_KEYS = ['label', 'min_rooms', 'max_rooms', 'discount_rate_pct'] as const

export async function saveVolumeDiscountTiers(
  supabase: SupabaseClient<Database>,
  serviceTier: ServiceTierId,
  prev: VolumeTierRow[],
  next: VolumeTierRow[],
  changedBy: string,
): Promise<VolumeTierRow[]> {
  const prevById = new Map(prev.map((r) => [r.id, r]))
  const logs: ChangeLogInsert[] = []

  for (const row of next) {
    const old = prevById.get(row.id)
    if (!old) continue
    for (const key of VOLUME_KEYS) {
      const before = old[key]
      const after = row[key]
      if (formatLogValue(before) !== formatLogValue(after)) {
        logs.push({
          tier: null,
          service_tier: serviceTier,
          field_name: `volume_discount_tiers.${row.id}.${key}`,
          old_value: formatLogValue(before),
          new_value: formatLogValue(after),
          changed_by: changedBy,
        })
      }
    }
  }

  if (logs.length === 0) {
    return next.slice().sort((a, b) => a.min_rooms - b.min_rooms)
  }

  const updated: VolumeTierRow[] = []
  for (const row of next) {
    const { data, error } = await supabase
      .from('volume_discount_tiers')
      .update({
        label: row.label,
        min_rooms: row.min_rooms,
        max_rooms: row.max_rooms,
        discount_rate_pct: row.discount_rate_pct,
      })
      .eq('id', row.id)
      .select('*')
      .single()
    if (error) throw error
    updated.push(data as VolumeTierRow)
  }

  await insertChangeLogs(supabase, logs)
  return updated.sort((a, b) => a.min_rooms - b.min_rooms)
}

export async function refreshChangeLog(
  supabase: SupabaseClient<Database>,
  logLimit = 500,
): Promise<ChangeLogRow[]> {
  const { data, error } = await supabase
    .from('pricing_change_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(logLimit)
  if (error) throw error
  return (data ?? []) as ChangeLogRow[]
}
