/**
 * NSW tenancy rules by tier — structural migration from resolveTenancyPackage bond helpers.
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

const NSW_T1_BOND: TenancyBondRules = {
  schemeApplies: false,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: 'NSW Fair Trading',
}

const NSW_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  authority: 'NSW Fair Trading',
  authorityUrl: 'https://www.nsw.gov.au/housing-and-construction/renting',
  maxBondMonths: 1,
  lodgementDays: 10,
  receiptDays: 15,
  authorityPublicLabel: 'NSW Fair Trading (Rental Bonds Online)',
  landlordAckAuthorityName: null,
}

export function nswTenancyRules(tier: 'T1' | 'T2'): TenancyRules {
  return {
    bond: tier === 'T1' ? NSW_T1_BOND : NSW_T2_BOND,
  }
}
