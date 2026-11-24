/**
 * VIC tenancy rules - T1 on-site licence (owner-held security deposit) vs T2 Form 1 (RTBA bond).
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

const VIC_T1_BOND: TenancyBondRules = {
  schemeApplies: false,
  maxBondCopy: null,
  authority: null,
  authorityUrl: null,
  maxBondMonths: null,
  lodgementDays: null,
  lodgementDaysUnit: null,
  receiptDays: null,
  authorityPublicLabel: null,
  landlordAckAuthorityName: 'Residential Tenancies Bond Authority (RTBA)',
}

const VIC_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: null,
  authority: 'RTBA',
  authorityUrl: 'https://www.rtba.vic.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'business',
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Bond Authority (RTBA)',
  landlordAckAuthorityName: null,
}

const VIC_T3_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy:
    'The bond on a fixed-term rooming house agreement must not be more than 28 days rent. It is lodged with the Residential Tenancies Bond Authority (RTBA).',
  authority: 'RTBA',
  authorityUrl: 'https://www.rtba.vic.gov.au/',
  maxBondMonths: null,
  lodgementDays: 10,
  lodgementDaysUnit: 'business',
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Bond Authority (RTBA)',
  landlordAckAuthorityName: null,
}

export function vicTenancyRules(tier: 'T1' | 'T2' | 'T3'): TenancyRules {
  return {
    bond: tier === 'T1' ? VIC_T1_BOND : tier === 'T3' ? VIC_T3_BOND : VIC_T2_BOND,
  }
}
