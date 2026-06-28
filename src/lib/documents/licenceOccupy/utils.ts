import type { OccupancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import {
  listingBondPaymentOccupancyProse,
  listingLandlordHeldPayeeOccupancyLines,
  type ListingBondPaymentOccupancyProse,
} from '../../../../api/lib/tenancy/listingBondPaymentCopy.js'
import { resolveTenancyPackage } from '../../../../api/lib/resolveTenancyPackage.js'
import type { LicenceOccupyContent } from './contentTypes.js'

/** Notice period text aligned to payment method wording (weekly default). */
export function licenceTerminationNoticePhrase(paymentMethod: string): string {
  const m = paymentMethod.toLowerCase()
  if (m.includes('fortnight')) {
    return 'where the licence fee is payable fortnightly, at least two weeks\' written notice;'
  }
  if (m.includes('month')) {
    return 'where the licence fee is payable monthly, at least one calendar month\'s written notice;'
  }
  return 'where the licence fee is payable weekly, at least one week\'s written notice;'
}

/** Mirrors DEFAULT_LISTING_FEE_CENTS in api/lib/pricing/resolvePlatformFee.js */
export const LISTING_TIER_ACCEPTANCE_FEE_DISPLAY = '$99'

export type LicenceOccupyServiceTier = 'listing' | 'managed'

function formatManagedFeePercent(percent: number): string {
  const n = Number(percent)
  if (!Number.isFinite(n) || n <= 0) return '7%'
  return `${n.toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
}

/** Clause 11 owner-side fee paragraph - driven by booking service tier. */
export function ownerServiceFeeParagraphForTier(
  tier: LicenceOccupyServiceTier,
  managedFeePercent: number,
  listingFeeDisplay: string = LISTING_TIER_ACCEPTANCE_FEE_DISPLAY,
  partyLabel: string = 'Owner',
): string {
  const party = partyLabel === 'Principal' ? 'Principal' : partyLabel.toLowerCase()
  if (tier === 'managed') {
    const pct = formatManagedFeePercent(managedFeePercent)
    return `Quni facilitates payment of the weekly licence fee through the Platform. A Managed service fee of ${pct} of the gross weekly licence fee is deducted from amounts payable to the ${party} before payout to the ${party}, as disclosed in the ${party} service agreement and listing terms.`
  }
  return `The ${party} has accepted this booking under the Quni Listing service tier. A one-off platform fee of ${listingFeeDisplay} (AUD) is charged to the ${party} separately when the booking is accepted - it is not deducted from the weekly licence fee. The weekly licence fee is paid directly to the ${party} by the resident, fee-free.`
}

/** Clause 11 bank intro — populated payee or static template fallback. */
export function occupancyClause11BankDetailsIntro(
  content: LicenceOccupyContent,
  props: OccupancyAgreementProps,
): string {
  if (!props.payout || !props.paymentReference?.trim()) {
    return content.bankDetailsTemplate
  }
  const scope =
    props.schemeApplies === true
      ? 'the weekly licence fee'
      : 'the weekly licence fee and security deposit'
  return `Direct credit details for payment of ${scope} are set out below and are also shown on the Platform and in booking correspondence.`
}

export function occupancyClause11PayeeLines(props: OccupancyAgreementProps): string[] {
  if (!props.payout || !props.paymentReference?.trim()) return []
  return listingLandlordHeldPayeeOccupancyLines(props.payout, props.paymentReference) ?? []
}

/** Clause 4 cross-reference when Listing payee is populated. */
export function occupancyFinancialTermsPayeeNote(props: OccupancyAgreementProps): string | null {
  if (!props.payout) return null
  return 'The weekly licence fee is paid to the account set out in clause 11.'
}

/** Clause 5 cross-reference for NSW/VIC landlord-held bond. */
export function occupancyBondSectionPayeeNote(props: OccupancyAgreementProps): string | null {
  if (!props.payout || props.schemeApplies === true) return null
  return 'Any security deposit under this licence is paid to the same account set out in clause 11.'
}

/** QLD §5 supplement — preference-aware bond payment routes (existing guidance copy). */
export function occupancyQldBondPaymentSupplement(props: OccupancyAgreementProps): ListingBondPaymentOccupancyProse | null {
  if (props.schemeApplies !== true) return null
  if (props.bond.amount == null || !Number.isFinite(props.bond.amount) || props.bond.amount <= 0) {
    return null
  }

  const propertyType = props.premises.propertyType ?? ''
  const pkg = resolveTenancyPackage({
    state: 'QLD',
    property_type: propertyType,
    is_registered_rooming_house: false,
    date: props.term.startDate || undefined,
  })
  if (!pkg.supported) return null

  return listingBondPaymentOccupancyProse(pkg.rules.bond, 'QLD', {
    qldBondRemittancePreference: props.qldBondRemittancePreference ?? undefined,
    payee: props.payout ?? undefined,
    paymentReference: props.paymentReference,
  })
}
