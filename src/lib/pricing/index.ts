import type { SupabaseClient } from '@supabase/supabase-js'
import { apiUrl } from '../apiUrl'
import type { Database } from '../database.types'

export type PricingCell = {
  property_tier: 't1' | 't2' | 't3'
  service_tier: 'listing' | 'managed'
  fee_mode: 'percent' | 'fixed'
  fee_percent: number
  fee_fixed_cents: number
  student_fee_mode: 'percent' | 'fixed'
  student_fee_percent: number
  student_fee_fixed_cents: number
  card_surcharge_enabled: boolean
  free_transfer_required: boolean
  utilities_cap_aud: number
}

export type PropertyFeeSnapshotRow = Database['public']['Tables']['property_fee_snapshots']['Row']

export {
  ResolveWeeklyRentError,
  maxWeeklyRentForProperty,
  propertyHasVariableOccupancyPricing,
  resolveWeeklyRent,
  type OccupancyPricingProperty,
  type RentBreakdownAud,
  type RentBreakdownCents,
  type ResolveWeeklyRentErrorCode,
  type ResolveWeeklyRentInput,
  type ResolveWeeklyRentResult,
} from './resolveWeeklyRent'

/** Maps an active snapshot row to PricingCell (same shape as `/api/pricing` tier responses). */
export function pricingSnapshotRowToCell(row: PropertyFeeSnapshotRow): PricingCell {
  const pt = String(row.source_property_tier || '').trim().toLowerCase()
  if (pt !== 't1' && pt !== 't2' && pt !== 't3') {
    throw new Error(`Invalid source_property_tier on snapshot: ${row.source_property_tier}`)
  }
  const st = row.service_tier === 'listing' || row.service_tier === 'managed' ? row.service_tier : null
  if (!st) throw new Error(`Invalid service_tier on snapshot: ${row.service_tier}`)
  return {
    property_tier: pt,
    service_tier: st,
    fee_mode: row.fee_mode === 'fixed' ? 'fixed' : 'percent',
    fee_percent: Number(row.fee_percent ?? 0),
    fee_fixed_cents: Number(row.fee_fixed_cents ?? 0),
    student_fee_mode: row.student_fee_mode === 'fixed' ? 'fixed' : 'percent',
    student_fee_percent: Number(row.student_fee_percent ?? 0),
    student_fee_fixed_cents: Number(row.student_fee_fixed_cents ?? 0),
    card_surcharge_enabled: Boolean(row.card_surcharge_enabled),
    free_transfer_required: Boolean(row.free_transfer_required),
    utilities_cap_aud: Number(row.utilities_cap_aud ?? 0),
  }
}

export async function fetchPricingForPropertyTier(
  propertyTier: 't1' | 't2' | 't3',
  serviceTier: 'listing' | 'managed' = 'managed',
): Promise<PricingCell> {
  const res = await fetch(
    apiUrl(`/api/pricing/${propertyTier}?service_tier=${encodeURIComponent(serviceTier)}`),
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Failed to load pricing for ${propertyTier}/${serviceTier}`)
  }
  return res.json() as Promise<PricingCell>
}

/** Loads locked snapshot rows for an existing listing (edit mode payout preview). */
export async function fetchLockedPricingSnapshotsForProperty(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<{ listing: PricingCell; managed: PricingCell }> {
  const { data: rows, error } = await client
    .from('property_fee_snapshots')
    .select(
      'service_tier,source_property_tier,fee_mode,fee_percent,fee_fixed_cents,student_fee_mode,student_fee_percent,student_fee_fixed_cents,card_surcharge_enabled,free_transfer_required,utilities_cap_aud',
    )
    .eq('property_id', propertyId)
    .eq('is_active', true)

  if (error) throw error
  const listing = rows?.find((r) => r.service_tier === 'listing')
  const managed = rows?.find((r) => r.service_tier === 'managed')
  if (!listing || !managed) {
    throw new Error('Missing active fee snapshots for this listing')
  }
  return {
    listing: pricingSnapshotRowToCell(listing as PropertyFeeSnapshotRow),
    managed: pricingSnapshotRowToCell(managed as PropertyFeeSnapshotRow),
  }
}

export function calculateBookingFeeCents(cell: PricingCell, weeklyRentCents: number): number {
  if (cell.student_fee_mode === 'percent') {
    const pct = Number(cell.student_fee_percent || 0)
    if (!Number.isFinite(pct) || pct <= 0) return 0
    return Math.max(0, Math.round(Number(weeklyRentCents || 0) * (pct / 100)))
  }
  const fixed = Number(cell.student_fee_fixed_cents || 0)
  if (!Number.isFinite(fixed) || fixed <= 0) return 0
  return Math.round(fixed)
}

export function resolvePropertyTierFromListing(
  propertyType: string | null | undefined,
  isRegisteredRoomingHouse: boolean | null | undefined,
): 't1' | 't2' | 't3' {
  const pt = String(propertyType || '').trim()
  if (pt === 'private_room_landlord_on_site') return 't1'
  if (pt === 'private_room_landlord_off_site' && Boolean(isRegisteredRoomingHouse)) return 't3'
  return 't2'
}

/** Weekly amount the landlord keeps after the managed-tier landlord fee (Connect application_fee). */
export function landlordNetWeeklyAfterManagedFee(rentAud: number, cell: PricingCell): number | null {
  if (!Number.isFinite(rentAud) || rentAud <= 0) return null
  if (cell.fee_mode === 'percent') {
    const pct = Number(cell.fee_percent || 0)
    if (!Number.isFinite(pct) || pct < 0) return null
    return Math.round((rentAud * (100 - pct)) / 100 * 100) / 100
  }
  const fixedAud = Number(cell.fee_fixed_cents || 0) / 100
  if (!Number.isFinite(fixedAud)) return null
  return Math.max(0, Math.round((rentAud - fixedAud) * 100) / 100)
}

/** Human-readable one-off listing-tier acceptance fee (e.g. $99). */
export function formatListingTierAcceptanceFee(cell: PricingCell): string {
  if (cell.fee_mode === 'fixed' && Number(cell.fee_fixed_cents) > 0) {
    const aud = Number(cell.fee_fixed_cents) / 100
    return `$${aud.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (cell.fee_mode === 'percent' && Number(cell.fee_percent) > 0) {
    return `${Number(cell.fee_percent).toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
  }
  return '—'
}

export function formatFeeForDisplay(cell: PricingCell) {
  const toAud = (cents: number) =>
    `$${(Number(cents || 0) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return {
    landlordFeeDisplay:
      cell.fee_mode === 'percent'
        ? `${Number(cell.fee_percent || 0).toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
        : toAud(cell.fee_fixed_cents),
    studentFeeDisplay:
      cell.student_fee_mode === 'percent'
        ? `${Number(cell.student_fee_percent || 0).toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
        : toAud(cell.student_fee_fixed_cents),
    studentFeeFixedDisplay: toAud(cell.student_fee_fixed_cents),
    cardSurchargeDomestic: '1.7% + $0.30',
    cardSurchargeInternational: '3.5% + $0.30',
  }
}
