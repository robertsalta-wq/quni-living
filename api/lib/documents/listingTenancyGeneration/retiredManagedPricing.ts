import type { PricingCell } from '../../pricing/index.js'

/**
 * Agreements no longer read the managed pricing row. This zero cell keeps the
 * existing prop shape without a database lookup.
 */
export const RETIRED_MANAGED_PRICING_CELL: PricingCell = {
  property_tier: 't1',
  service_tier: 'listing',
  fee_mode: 'fixed',
  fee_percent: 0,
  fee_fixed_cents: 0,
  student_fee_mode: 'fixed',
  student_fee_percent: 0,
  student_fee_fixed_cents: 0,
  card_surcharge_enabled: false,
  free_transfer_required: true,
  utilities_cap_aud: 0,
}
