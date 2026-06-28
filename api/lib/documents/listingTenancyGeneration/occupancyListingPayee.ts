import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import type { OccupancyPayeePdf } from '../../../documents/rtaTypes.js'
import { resolveTenancyPackage } from '../../resolveTenancyPackage.js'
import { effectiveQldBondRemittancePreference, parseQldBondRemittancePreference } from '../../tenancy/qldBondRemittance.js'
import { propertyPayoutDetailsComplete } from '../../../../src/lib/propertyPayoutDetails.js'

export type OccupancyListingPayeeFields = {
  payout: OccupancyPayeePdf | null
  paymentReference: string
  qldBondRemittancePreference: 'landlord_collects_remits' | 'tenant_choice' | null
  schemeApplies: boolean
}

function studentDisplayName(sp: {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
}): string {
  return (
    [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof sp.full_name === 'string' && sp.full_name.trim()) ||
    'Resident'
  )
}

/**
 * Listing occupancy PDF: load payee + QLD preference + scheme flag (best-effort payout).
 */
export async function loadOccupancyListingPayeeFields(
  admin: SupabaseClient<Database>,
  args: {
    serviceTier: 'listing' | 'managed'
    propertyId: string | null | undefined
    prop: Record<string, unknown>
    moveIn: string
    sp: { first_name?: string | null; last_name?: string | null; full_name?: string | null }
    propertyAddressLine: string
  },
): Promise<OccupancyListingPayeeFields> {
  const propertyType = typeof args.prop.property_type === 'string' ? args.prop.property_type.trim() : ''
  const propState = typeof args.prop.state === 'string' && args.prop.state.trim() ? args.prop.state.trim() : 'NSW'
  const isRooming = Boolean(args.prop.is_registered_rooming_house)
  const tenancyPackage = resolveTenancyPackage({
    state: propState,
    property_type: propertyType,
    is_registered_rooming_house: isRooming,
    date: args.moveIn || undefined,
  })
  const schemeApplies = tenancyPackage.supported && tenancyPackage.rules.bond.schemeApplies === true

  const studentName = studentDisplayName(args.sp)
  const addr = args.propertyAddressLine.trim()
  const title = typeof args.prop.title === 'string' ? args.prop.title.trim() : ''
  const paymentReference = `${studentName} — ${addr || title}`.trim()

  const qldPrefRaw =
    typeof args.prop.qld_bond_remittance_preference === 'string'
      ? args.prop.qld_bond_remittance_preference
      : null
  const qldBondRemittancePreference =
    propState.toUpperCase() === 'QLD'
      ? effectiveQldBondRemittancePreference(parseQldBondRemittancePreference(qldPrefRaw))
      : null

  let payout: OccupancyPayeePdf | null = null
  const propertyId =
    typeof args.propertyId === 'string' && args.propertyId.trim() ? args.propertyId.trim() : ''
  if (args.serviceTier === 'listing' && propertyId) {
    const { data: payoutRow, error: payoutErr } = await admin
      .from('property_payout_details')
      .select('account_name, bsb, account_number')
      .eq('property_id', propertyId)
      .maybeSingle()
    if (payoutErr) {
      console.error('[occupancy-payee] load payout details', payoutErr)
    } else if (payoutRow && propertyPayoutDetailsComplete(payoutRow)) {
      payout = {
        account_name: payoutRow.account_name!.trim(),
        bsb: payoutRow.bsb!.trim(),
        account_number: payoutRow.account_number!.trim(),
      }
    } else if (args.serviceTier === 'listing') {
      console.warn('[occupancy-payee] listing occupancy missing complete payout at generation', propertyId)
    }
  }

  return {
    payout,
    paymentReference,
    qldBondRemittancePreference,
    schemeApplies,
  }
}
