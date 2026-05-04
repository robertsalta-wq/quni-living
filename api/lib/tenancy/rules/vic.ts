/**
 * VIC tenancy rules — bond facts match current resolver bondRulesVicStatutory() for supported tiers.
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

const VIC_SUPPORTED_BOND: TenancyBondRules = {
  schemeApplies: true,
  authority: 'RTBA',
  authorityUrl: 'https://www.rtba.vic.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Bond Authority (RTBA)',
  landlordAckAuthorityName: null,
}

/** Resolver emits vic-form1 for VIC T1 and T2 (non-rooming); bond rules are the same today. */
export function vicTenancyRules(_tier: 'T1' | 'T2'): TenancyRules {
  return {
    bond: VIC_SUPPORTED_BOND,
  }
}
