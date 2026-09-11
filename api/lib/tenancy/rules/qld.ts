/**
 * QLD tenancy rules by tier - mirrors nsw.ts export shape.
 * Tier 3 is Form R18 rooming accommodation. Bond is lodged with the RTA.
 */
import type { TenancyBondRules, TenancyRules } from './types.js'

/** Boarder/lodger (landlord on-site): bond must still be lodged with the RTA within 10 days (unlike NSW T1). */
const QLD_T1_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: 'Under Queensland law, bond cannot exceed 4 weeks rent.',
  authority: 'Residential Tenancies Authority (RTA Queensland)',
  authorityUrl: 'https://www.rta.qld.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'calendar',
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Authority (RTA)',
  landlordAckAuthorityName: null,
}

/** Residential tenancy (Form 18a path): RTRA Act 2008; bond with RTA. */
const QLD_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: 'Under Queensland law, bond cannot exceed 4 weeks rent.',
  authority: 'Residential Tenancies Authority (RTA Queensland)',
  authorityUrl: 'https://www.rta.qld.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'calendar',
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Authority (RTA)',
  landlordAckAuthorityName: null,
}

/** Rooming accommodation (Form R18): bond with RTA, same 4-week cap as general tenancy. */
const QLD_T3_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: 'Under Queensland law, bond cannot exceed 4 weeks rent.',
  authority: 'Residential Tenancies Authority (RTA Queensland)',
  authorityUrl: 'https://www.rta.qld.gov.au/',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'calendar',
  receiptDays: 15,
  authorityPublicLabel: 'Residential Tenancies Authority (RTA)',
  landlordAckAuthorityName: null,
}

export function qldTenancyRules(tier: 'T1' | 'T2' | 'T3'): TenancyRules {
  if (tier === 'T1') return { bond: QLD_T1_BOND }
  if (tier === 'T3') return { bond: QLD_T3_BOND }
  return { bond: QLD_T2_BOND }
}
