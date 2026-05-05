/**
 * Typed tenancy regulatory facts (bond first). Lives under api/lib for Vercel bundles.
 */

/** Bond rules when the statutory lodgement scheme does not apply (e.g. NSW T1 boarder/lodger). */
export interface TenancyBondRulesSchemeOff {
  schemeApplies: false
  maxBondCopy: null
  authority: null
  authorityUrl: null
  maxBondMonths: null
  lodgementDays: null
  lodgementDaysUnit: null
  receiptDays: null
  authorityPublicLabel: null
  /** Landlord-held acknowledgement checkbox — regulator named (e.g. NSW Tier 1 boarder/lodger) */
  landlordAckAuthorityName: string | null
}

/** Bond rules when bond must be lodged with the state authority. */
export interface TenancyBondRulesSchemeOn {
  schemeApplies: true
  /** Tenant-facing statutory cap sentence after bond amount; null to omit. */
  maxBondCopy: string | null
  authority: string
  authorityUrl: string
  maxBondMonths: number | null
  lodgementDays: number
  /**
   * How lodgementDays should be read in tenant-facing copy.
   * NSW/VIC use business days; QLD RTRA uses calendar days for the lodgement period.
   */
  lodgementDaysUnit: 'business' | 'calendar'
  receiptDays: number | null
  /** Line shown under “{STATE} — state bond authority” on the bond step */
  authorityPublicLabel: string
  landlordAckAuthorityName: null
}

export type TenancyBondRules = TenancyBondRulesSchemeOff | TenancyBondRulesSchemeOn

/** Future: tribunal, terminology, notices, minStandards — add when a consumer exists. */
export interface TenancyRules {
  bond: TenancyBondRules
}
