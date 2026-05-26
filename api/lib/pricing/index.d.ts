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

export function getPricingForCell(
  propertyTier: 't1' | 't2' | 't3' | string,
  serviceTier?: 'listing' | 'managed' | string,
): Promise<PricingCell>

export function mapSnapshotRowToPricingCell(row: Record<string, unknown>): PricingCell

export function getActivePricingSnapshotForProperty(
  propertyId: string,
  serviceTier?: 'listing' | 'managed' | string,
): Promise<PricingCell>

export function formatFeeForDisplay(cell: PricingCell): {
  landlordFeeDisplay: string
  studentFeeDisplay: string
  studentFeeFixedDisplay: string
  landlordFeeFixedDisplay: string
  cardSurchargeEnabled: boolean
  cardSurchargeDomestic: string
  cardSurchargeInternational: string
  utilitiesCapDisplay: string
}

export function calculateBookingFeeCents(
  cell: PricingCell,
  weeklyRentCents: number,
  leaseWeeks?: number,
  options?: {
    admin?: import('@supabase/supabase-js').SupabaseClient
    landlordProfileId?: string
  },
): Promise<number>

export function resolvePropertyTierFromListing(
  propertyType: string,
  isRegisteredRoomingHouse: boolean,
): 't1' | 't2' | 't3'
