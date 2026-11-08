import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import type { OccupancyPayeePdf } from '../../../documents/rtaTypes.js'
import { resolveTenancyPackage, tenancyPackageInputFromPropertyRow } from '../../resolveTenancyPackage.js'
import { effectiveQldBondRemittancePreference, parseQldBondRemittancePreference } from '../../tenancy/qldBondRemittance.js'
import { loadLandlordPayoutBankForDocument } from './landlordPayoutBank.js'

export type OccupancyListingPayeeFields = {
  payout: OccupancyPayeePdf
  paymentReference: string
  qldBondRemittancePreference: 'landlord_collects_remits' | 'tenant_choice' | null
  schemeApplies: boolean
}

export type OccupancyListingPayeeLoad =
  | ({ ok: true } & OccupancyListingPayeeFields)
  | { ok: false; status: number; error: string }

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
 * Occupancy PDF payee. Refuses to build when the landlord account is incomplete.
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
): Promise<OccupancyListingPayeeLoad> {
  void args.serviceTier
  const propState = typeof args.prop.state === 'string' && args.prop.state.trim() ? args.prop.state.trim() : 'NSW'
  const tenancyPackage = resolveTenancyPackage(
    tenancyPackageInputFromPropertyRow(args.prop, { date: args.moveIn || undefined }),
  )
  const schemeApplies = tenancyPackage.supported && tenancyPackage.rules.bond.schemeApplies === true

  const studentName = studentDisplayName(args.sp)
  const addr = args.propertyAddressLine.trim()
  const title = typeof args.prop.title === 'string' ? args.prop.title.trim() : ''
  const paymentReference = `${studentName} - ${addr || title}`.trim()

  const qldPrefRaw =
    typeof args.prop.qld_bond_remittance_preference === 'string'
      ? args.prop.qld_bond_remittance_preference
      : null
  const qldBondRemittancePreference =
    propState.toUpperCase() === 'QLD'
      ? effectiveQldBondRemittancePreference(parseQldBondRemittancePreference(qldPrefRaw))
      : null

  const bank = await loadLandlordPayoutBankForDocument(admin, args.propertyId)
  if (!bank.ok) return bank

  return {
    ok: true,
    payout: {
      account_name: bank.bankDetails.accountName,
      bsb: bank.bankDetails.bsb,
      account_number: bank.bankDetails.accountNumber,
    },
    paymentReference,
    qldBondRemittancePreference,
    schemeApplies,
  }
}
