/**
 * Locked Schedule 7 text. Source: docs/legal/qld-prescribed-house-rules-sch7.md
 * (Residential Tenancies and Rooming Accommodation Regulation 2025, reprint from 1 September 2026).
 * Do not paraphrase. Rule 2(1) stem uses the instrument's dash (U+2014).
 */

export type Schedule7StaticClause = {
  id: string
  text: string
}

export type Schedule7Rule = {
  number: number
  title: string
  clauses: Schedule7StaticClause[]
}

/** Instrument: "Residents must maintain their rooms—" then (a) and (b). */
const RULE_2_1_STEM = 'Residents must maintain their rooms\u2014'

export const SCHEDULE_7_RULE_1_TITLE = "Residents' and guests' behaviour"
export const SCHEDULE_7_RULE_1_1 =
  'Residents must not interfere with the reasonable peace, comfort or privacy of other residents.'
export const SCHEDULE_7_RULE_1_2 =
  'Residents must ensure their guests do not interfere with the reasonable peace, comfort or privacy of other residents.'

export const SCHEDULE_7_RULE_2_TITLE = 'Maintenance of rooms'
export const SCHEDULE_7_RULE_2_1_A =
  'in a way that does not interfere with the reasonable comfort of other residents; and'
export const SCHEDULE_7_RULE_2_1_B = 'in a condition that does not create a fire or health hazard.'
export const SCHEDULE_7_RULE_2_1 = `${RULE_2_1_STEM}\n(a) ${SCHEDULE_7_RULE_2_1_A}\n(b) ${SCHEDULE_7_RULE_2_1_B}`
export const SCHEDULE_7_RULE_2_2 =
  'Residents must not intentionally or recklessly damage or destroy any part of their rooms or a facility in their rooms.'

export const SCHEDULE_7_RULE_3_TITLE = 'Common areas'
export const SCHEDULE_7_RULE_3_1 =
  'The provider must take reasonable steps to ensure the common areas, and facilities provided in the common areas, are kept safe, clean and in good repair.'
export const SCHEDULE_7_RULE_3_2 =
  'However, the obligation for the provider to take reasonable steps to ensure the common areas and facilities are kept clean is subject to any agreement with the resident.'
export const SCHEDULE_7_RULE_3_3 = 'Residents must leave common areas clean and tidy after using them.'
export const SCHEDULE_7_RULE_3_4 =
  'Residents must ensure their guests leave common areas clean and tidy after using them.'

/** Locked prefix of rule 3(5). The square-bracket example stays in the source file, not the generated PDF. */
export const SCHEDULE_7_RULE_3_5_PREFIX = 'Common areas in these rental premises include'

/** Full 3(5) line as printed in Schedule 7, including the insert prompt. Golden tests match this to sch7.md. */
export const SCHEDULE_7_RULE_3_5_SOURCE =
  'Common areas in these rental premises include [insert description of common areas, e.g. lounge or television room, dining room, toilets and bathrooms, kitchen, hallway, patio, yard].'

export const SCHEDULE_7_RULE_4_TITLE = 'Guests'
export const SCHEDULE_7_RULE_4 =
  'Residents must ensure their guests are aware of the house rules for these rental premises.'

export const SCHEDULE_7_RULE_5_TITLE = 'Quiet enjoyment'
export const SCHEDULE_7_RULE_5_1 =
  "The provider must take reasonable steps to ensure residents have quiet enjoyment of the resident's room and common areas."
export const SCHEDULE_7_RULE_5_2 =
  "The provider must not enter residents' rooms other than as provided under the Residential Tenancies and Rooming Accommodation Act 2008."

export const SCHEDULE_7_RULE_6_TITLE = 'Door locks and keys'
export const SCHEDULE_7_RULE_6_1 =
  'Residents must not tamper with, or change, a door lock in the rental premises.'
export const SCHEDULE_7_RULE_6_2 =
  "However, the resident may request the provider to change a lock that secures entry to the resident's room under the Residential Tenancies and Rooming Accommodation Act 2008, section 251."
export const SCHEDULE_7_RULE_6_3 = "Residents must not make copies of keys without the provider's permission."

export const SCHEDULE_7_RULE_7_TITLE = 'Animals'
export const SCHEDULE_7_RULE_7_1 =
  "Residents must not keep an animal on the rental premises without the provider's permission."
export const SCHEDULE_7_RULE_7_2 = 'Subsection (1) does not apply to a working dog.'

export const SCHEDULE_7_RULES: readonly Schedule7Rule[] = [
  {
    number: 1,
    title: SCHEDULE_7_RULE_1_TITLE,
    clauses: [
      { id: '1(1)', text: SCHEDULE_7_RULE_1_1 },
      { id: '1(2)', text: SCHEDULE_7_RULE_1_2 },
    ],
  },
  {
    number: 2,
    title: SCHEDULE_7_RULE_2_TITLE,
    clauses: [
      { id: '2(1)', text: SCHEDULE_7_RULE_2_1 },
      { id: '2(2)', text: SCHEDULE_7_RULE_2_2 },
    ],
  },
  {
    number: 3,
    title: SCHEDULE_7_RULE_3_TITLE,
    clauses: [
      { id: '3(1)', text: SCHEDULE_7_RULE_3_1 },
      { id: '3(2)', text: SCHEDULE_7_RULE_3_2 },
      { id: '3(3)', text: SCHEDULE_7_RULE_3_3 },
      { id: '3(4)', text: SCHEDULE_7_RULE_3_4 },
    ],
  },
  {
    number: 4,
    title: SCHEDULE_7_RULE_4_TITLE,
    clauses: [{ id: '4', text: SCHEDULE_7_RULE_4 }],
  },
  {
    number: 5,
    title: SCHEDULE_7_RULE_5_TITLE,
    clauses: [
      { id: '5(1)', text: SCHEDULE_7_RULE_5_1 },
      { id: '5(2)', text: SCHEDULE_7_RULE_5_2 },
    ],
  },
  {
    number: 6,
    title: SCHEDULE_7_RULE_6_TITLE,
    clauses: [
      { id: '6(1)', text: SCHEDULE_7_RULE_6_1 },
      { id: '6(2)', text: SCHEDULE_7_RULE_6_2 },
      { id: '6(3)', text: SCHEDULE_7_RULE_6_3 },
    ],
  },
  {
    number: 7,
    title: SCHEDULE_7_RULE_7_TITLE,
    clauses: [
      { id: '7(1)', text: SCHEDULE_7_RULE_7_1 },
      { id: '7(2)', text: SCHEDULE_7_RULE_7_2 },
    ],
  },
]

export const SCHEDULE_7_VERBATIM_STRINGS: readonly string[] = [
  SCHEDULE_7_RULE_1_TITLE,
  SCHEDULE_7_RULE_1_1,
  SCHEDULE_7_RULE_1_2,
  SCHEDULE_7_RULE_2_TITLE,
  RULE_2_1_STEM,
  SCHEDULE_7_RULE_2_1_A,
  SCHEDULE_7_RULE_2_1_B,
  SCHEDULE_7_RULE_2_2,
  SCHEDULE_7_RULE_3_TITLE,
  SCHEDULE_7_RULE_3_1,
  SCHEDULE_7_RULE_3_2,
  SCHEDULE_7_RULE_3_3,
  SCHEDULE_7_RULE_3_4,
  SCHEDULE_7_RULE_3_5_SOURCE,
  SCHEDULE_7_RULE_4_TITLE,
  SCHEDULE_7_RULE_4,
  SCHEDULE_7_RULE_5_TITLE,
  SCHEDULE_7_RULE_5_1,
  SCHEDULE_7_RULE_5_2,
  SCHEDULE_7_RULE_6_TITLE,
  SCHEDULE_7_RULE_6_1,
  SCHEDULE_7_RULE_6_2,
  SCHEDULE_7_RULE_6_3,
  SCHEDULE_7_RULE_7_TITLE,
  SCHEDULE_7_RULE_7_1,
  SCHEDULE_7_RULE_7_2,
]

/**
 * Complete Schedule 7 rule 3(5) with the provider's common-areas description.
 * Blank insert is refused by the document builder, not here.
 */
export function formatSchedule7Rule35(commonAreasDescription: string): string {
  const insert = commonAreasDescription.trim().replace(/\.+$/, '')
  return `${SCHEDULE_7_RULE_3_5_PREFIX} ${insert}.`
}
