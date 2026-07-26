/**
 * Landlord rule map v0 — structure + Q3 product-bond compatibility slice only.
 * No external tenancy law is populated: Q1–Q2 and Q4–Q8 stay fully empty.
 */
import type { RuleMapBondByTier, RuleMapRow, TenancyBondRules } from './types.js'

/** Exact product bond facts from `nsw.ts` (compatibility bridge — not external law). */
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

const NSW_BOND_BY_TIER: RuleMapBondByTier = {
  T1: NSW_T1_BOND,
  T2: NSW_T2_BOND,
}

/** Exact product bond facts from `qld.ts` (compatibility bridge — not external law). */
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

const QLD_BOND_BY_TIER: RuleMapBondByTier = {
  T1: QLD_T1_BOND,
  T2: QLD_T2_BOND,
}

function emptyRow(
  partial: Pick<RuleMapRow, 'id' | 'question' | 'state' | 'needsSolicitor' | 'notes'> &
    Partial<Pick<RuleMapRow, 'sourceUrl' | 'sourceType' | 'bondByTier'>>,
): RuleMapRow {
  return {
    productRegime: null,
    legalRegime: null,
    provision: null,
    rule: null,
    sourceUrl: partial.sourceUrl ?? null,
    sourceType: partial.sourceType ?? null,
    dateChecked: null,
    reviewDate: null,
    confidence: 'empty',
    id: partial.id,
    question: partial.question,
    state: partial.state,
    needsSolicitor: partial.needsSolicitor,
    notes: partial.notes,
    ...(partial.bondByTier ? { bondByTier: partial.bondByTier } : {}),
  }
}

const Q1 =
  'Q1 — Can I rent out a spare room in my own home, and how does it differ from letting a whole property?'
const Q2 = 'Q2 — What agreement/form applies to a room let, and how do the states differ?'
const Q3 = 'Q3 — Who lodges the bond, where does it go, and what happens at the end?'
const Q4 = 'Q4 — How many people before it becomes something else legally? (the 4-vs-5 line)'
const Q5 = 'Q5 — Obligations once someone moves in: entry notice, repairs, safety, records.'
const Q6 = "Q6 — What can and can't go in house rules?"
const Q7 =
  'Q7 — Does being in a strata scheme change anything? (by-laws, occupancy, subletting)'
const Q8 = 'Q8 — What do I need to know about tax and declaring room income?'

/**
 * Landlord rule map v0 rows (16). Law cells null except Q3 product bond slice for compatibility.
 */
export const LANDLORD_RULE_MAP_ROWS: readonly RuleMapRow[] = [
  emptyRow({
    id: 'Q1-NSW',
    question: Q1,
    state: 'NSW',
    needsSolicitor: true,
    notes:
      'THE regime-boundary question. Forks by on-site (occupancy/licence) vs off-site (residential). Boundary is the moat and is unsourced.',
  }),
  emptyRow({
    id: 'Q1-QLD',
    question: Q1,
    state: 'QLD',
    needsSolicitor: true,
    notes:
      'Forks by on-site (boarder/lodger, s43) vs off-site. Strongest existing QLD product package (qldBoarderLodger.ts) but still legal-review draft.',
  }),
  emptyRow({
    id: 'Q2-NSW',
    question: Q2,
    state: 'NSW',
    needsSolicitor: false,
    notes:
      'Form identities (FT6600) near-primary and citable — mechanical. WHY the law requires the form is the interpretive part.',
  }),
  emptyRow({
    id: 'Q2-QLD',
    question: Q2,
    state: 'QLD',
    needsSolicitor: false,
    notes: 'Form 18a v23 Sep25 — version-pinned, verify currency.',
  }),
  emptyRow({
    id: 'Q3-NSW',
    question: Q3,
    state: 'NSW',
    needsSolicitor: false,
    notes:
      'COMPATIBILITY TEST ROW. Existing typed bond rules (rules/nsw.ts) drop in here: authorityUrl -> sourceUrl. Mechanical figures (max weeks, 10 business days) need primary-source verify.',
    // Product citation only — not a verified legal rule sentence.
    sourceUrl: NSW_T2_BOND.authorityUrl,
    sourceType: 'product',
    bondByTier: NSW_BOND_BY_TIER,
  }),
  emptyRow({
    id: 'Q3-QLD',
    question: Q3,
    state: 'QLD',
    needsSolicitor: true,
    notes:
      'LIVE CONTRADICTION: bondPublicCopy (RTA lodgement) vs two docs (landlord-held) for hosted rooms. First real row to resolve against RTA primary source.',
    sourceUrl: QLD_T2_BOND.authorityUrl,
    sourceType: 'product',
    bondByTier: QLD_BOND_BY_TIER,
  }),
  emptyRow({
    id: 'Q4-NSW',
    question: Q4,
    state: 'NSW',
    needsSolicitor: true,
    notes:
      'Boarding Houses Act 2012 threshold. Open counsel question in-repo; no encoded rule. Solicitor territory.',
  }),
  emptyRow({
    id: 'Q4-QLD',
    question: Q4,
    state: 'QLD',
    needsSolicitor: true,
    notes:
      'Product constant MAX_ROOMS=3 (s43) is product-truth, not a cited rule. Rooming-accommodation threshold interpretive.',
  }),
  emptyRow({
    id: 'Q5-NSW',
    question: Q5,
    state: 'NSW',
    needsSolicitor: false,
    notes:
      'Mostly mechanical (entry 24h, inspection 7 days) but T1 vs T2 differ; existing knowledge is undated draft. Verify each against Fair Trading.',
  }),
  emptyRow({
    id: 'Q5-QLD',
    question: Q5,
    state: 'QLD',
    needsSolicitor: false,
    notes:
      'Thin in repo. Entry Form 9, condition Forms 1a/14a referenced in addendum. Verify against RTA.',
  }),
  emptyRow({
    id: 'Q6-NSW',
    question: Q6,
    state: 'NSW',
    needsSolicitor: true,
    notes:
      "We hold our own defaults; the 'what is FORBIDDEN' law is nothing. Open counsel question (Q-002). Solicitor territory.",
  }),
  emptyRow({
    id: 'Q6-QLD',
    question: Q6,
    state: 'QLD',
    needsSolicitor: true,
    notes:
      'Addendum says rules must not displace mandatory RTRA provisions; prohibited-terms list unsourced. Solicitor territory.',
  }),
  emptyRow({
    id: 'Q7-NSW',
    question: Q7,
    state: 'NSW',
    needsSolicitor: true,
    notes:
      'Repo has FT6600 checkboxes only; zero authority content. Primary: Strata Schemes Management Act 2015 (verify). Interaction (can a by-law block a room let) is interpretive -> solicitor.',
  }),
  emptyRow({
    id: 'Q7-QLD',
    question: Q7,
    state: 'QLD',
    needsSolicitor: true,
    notes:
      'Nothing in repo. Primary: Body Corporate and Community Management Act 1997 + BCCM Commissioner (verify). Clearview is a vendor summary — pointer only, never the source.',
  }),
  emptyRow({
    id: 'Q8-NSW',
    question: Q8,
    state: 'NSW',
    needsSolicitor: false,
    notes:
      'ATO territory (federal, not state) — specialist/accountant rather than solicitor. Nothing in repo.',
  }),
  emptyRow({
    id: 'Q8-QLD',
    question: Q8,
    state: 'QLD',
    needsSolicitor: false,
    notes:
      'Federal — same as NSW row. Tax is national; may collapse to one non-state row when populated.',
  }),
]
