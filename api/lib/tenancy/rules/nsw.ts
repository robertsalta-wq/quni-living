/**
 * NSW tenancy rules by tier - structural migration from resolveTenancyPackage bond helpers.
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

const NSW_T1_BOND: TenancyBondRules = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: 'NSW Fair Trading',
}

const NSW_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: 'Under NSW law, bond cannot exceed 4 weeks rent.',
  authority: 'NSW Fair Trading',
  authorityUrl: 'https://www.nsw.gov.au/housing-and-construction/renting',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'business',
  receiptDays: 15,
  authorityPublicLabel: 'NSW Fair Trading (Rental Bonds Online)',
  landlordAckAuthorityName: null,
}

const NSW_T3_BOND: TenancyBondRules = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: 'NSW Fair Trading',
}

export function nswTenancyRules(tier: 'T1' | 'T2' | 'T3'): TenancyRules {
  if (tier === 'T1') return { bond: NSW_T1_BOND }
  if (tier === 'T3') return { bond: NSW_T3_BOND }
  return { bond: NSW_T2_BOND }
}
