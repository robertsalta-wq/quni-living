import { apiUrl } from '../apiUrl'

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
