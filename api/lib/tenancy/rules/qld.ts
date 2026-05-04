/**
 * QLD tenancy rules by tier — mirrors nsw.ts export shape.
 * Tier 3 (rooming accommodation) is deferred in resolveTenancyPackage, not defined here (same pattern as vic.ts omitting T3).
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

/** Boarder/lodger (landlord on-site): bond must still be lodged with the RTA within 10 days (unlike NSW T1). */
const QLD_T1_BOND: TenancyBondRules = {
  schemeApplies: true,
  authority: 'Residential Tenancies Authority (RTA Queensland)',
  authorityUrl: 'https://www.rta.qld.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Authority (RTA)',
  landlordAckAuthorityName: null,
}

/** Residential tenancy (Form 18a path): RTRA Act 2008; bond with RTA. */
const QLD_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  authority: 'Residential Tenancies Authority (RTA Queensland)',
  authorityUrl: 'https://www.rta.qld.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Authority (RTA)',
  landlordAckAuthorityName: null,
}

export function qldTenancyRules(tier: 'T1' | 'T2'): TenancyRules {
  return {
    bond: tier === 'T1' ? QLD_T1_BOND : QLD_T2_BOND,
  }
}
