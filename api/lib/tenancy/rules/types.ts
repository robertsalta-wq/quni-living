/**
 * Typed tenancy regulatory facts (bond first). Lives under api/lib for Vercel bundles.
 *
 * Rule-map rows (`RuleMapRow`) are the upstream source-of-truth shape for the eight
 * landlord authority questions. Product `TenancyRules` remain the consumer bond slice:
 * Q3 rows carry `bondByTier` so `{ bond: row.bondByTier[tier] }` is a `TenancyRules`.
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
  /** Landlord-held acknowledgement checkbox - regulator named (e.g. NSW Tier 1 boarder/lodger) */
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
  /** Line shown under “{STATE} - state bond authority” on the bond step */
  authorityPublicLabel: string
  landlordAckAuthorityName: null
}

export type TenancyBondRules = TenancyBondRulesSchemeOff | TenancyBondRulesSchemeOn

/** Future: tribunal, terminology, notices, minStandards - add when a consumer exists. */
export interface TenancyRules {
  bond: TenancyBondRules
}

/** Confidence progression for landlord rule-map rows. Only `verified` may be served. */
export const RULE_MAP_CONFIDENCE_VALUES = [
  'empty',
  'sourced-unverified',
  'verified',
  'needs-solicitor',
] as const

export type RuleMapConfidence = (typeof RULE_MAP_CONFIDENCE_VALUES)[number]

export type RuleMapSourceType = 'primary-official' | 'product' | null

export type RuleMapState = 'NSW' | 'QLD'

/**
 * Product bond facts on Q3 rows, keyed by property tier.
 * Each value is `TenancyRules['bond']` - so existing `TenancyRules` is expressible as
 * `{ bond: row.bondByTier[tier] }`. Authority labels live here (not duplicated as URLs).
 */
export type RuleMapBondByTier = {
  T1: TenancyBondRules
  T2: TenancyBondRules
}

/**
 * One landlord authority question × state. Upstream map shape.
 * `sourceUrl` is the citation gate (was `authorityUrl` on bond scheme-on rules).
 */
export interface RuleMapRow {
  id: string
  question: string
  state: RuleMapState
  productRegime: string | null
  legalRegime: string | null
  provision: string | null
  /** Plain-sentence rule - null until sourced. Source-gated: requires `sourceUrl`. */
  rule: string | null
  /** Official or product citation URL (bond `authorityUrl` maps here). */
  sourceUrl: string | null
  sourceType: RuleMapSourceType
  dateChecked: string | null
  reviewDate: string | null
  confidence: RuleMapConfidence
  needsSolicitor: boolean
  notes: string
  /**
   * Q3 only: structured product bond slice copied from shipped `nsw.ts` / `qld.ts`.
   * Not external law. Generator emits `TenancyRules` from this.
   */
  bondByTier?: RuleMapBondByTier
}
