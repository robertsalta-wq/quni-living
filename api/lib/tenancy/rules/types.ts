/**
 * Typed tenancy regulatory facts (bond first). Lives under api/lib for Vercel bundles.
 */

export interface TenancyBondRules {
  schemeApplies: boolean
  authority: string | null
  authorityUrl: string | null
  maxBondMonths: number | null
  lodgementDays: number | null
  /**
   * How lodgementDays should be read in tenant-facing copy.
   * NSW uses business days; QLD RTRA uses calendar days for the lodgement period.
   */
  lodgementDaysUnit: 'business' | 'calendar' | null
  receiptDays: number | null
  /** Line shown under “{STATE} — state bond authority” on the bond step */
  authorityPublicLabel: string | null
  /** Landlord-held acknowledgement checkbox — regulator named (e.g. NSW Tier 1 boarder/lodger) */
  landlordAckAuthorityName: string | null
}

/** Future: tribunal, terminology, notices, minStandards — add when a consumer exists. */
export interface TenancyRules {
  bond: TenancyBondRules
}
