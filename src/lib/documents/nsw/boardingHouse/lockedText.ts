/**
 * Locked Fair Trading Standard Occupancy Agreement wording.
 * Canonical extract: docs/nsw/boarding-house-occupancy-master.txt
 * (from Quni-NSW-BoardingHouse-Occupancy-Agreement.docx). Master wins if they differ.
 *
 * Em dashes in this file are from the official form and must be kept.
 */

export const BH_TITLE = 'STANDARD OCCUPANCY AGREEMENT'
export const BH_SUBTITLE = 'For general boarding houses under the Boarding Houses Act 2012'
export const BH_BETWEEN_PROPRIETOR = 'Between — Proprietor'
export const BH_FOR_ROOM = 'For — Room'
export const BH_EMERGENCY_CONTACT_NAME = 'Emergency contact — Name:'

export const BH_CLAUSE_1_HEADING = '1. Condition of the Premises (occupancy principle 1)'
export const BH_CLAUSE_1_BODY =
  'The proprietor agrees to provide and maintain the premises so that they are in a reasonable state of repair, are reasonably clean and reasonably secure.'

export const BH_CLAUSE_2_HEADING = '2. House Rules (occupancy principle 2)'
export const BH_CLAUSE_2_BODY =
  'The resident agrees to comply with the House Rules of the boarding house, which are listed on the attached “Statement of House Rules.” House rules may not be inconsistent with the Occupancy Principles stated in Annexure 1, and are not enforceable if they are inconsistent.'

export const BH_CLAUSE_3_HEADING = '3. No Penalties (occupancy principle 3)'
export const BH_CLAUSE_3_BODY =
  'The resident is not required to pay a penalty for a breach of this Occupancy Agreement or the House Rules.'

export const BH_CLAUSE_4_HEADING = '4. Quiet Enjoyment (occupancy principle 4)'
export const BH_CLAUSE_4_BODY =
  'The proprietor agrees to take all reasonable steps to enable the resident’s quiet enjoyment of the premises.'

export const BH_CLAUSE_5_HEADING = '5. Inspections and Access (occupancy principle 5)'
export const BH_CLAUSE_5_INTRO_1 =
  'The proprietor may inspect boarding house common areas at any reasonable time. Repairs, cleaning and maintenance of common areas can be carried out at reasonable times.'
export const BH_CLAUSE_5_INTRO_2 =
  'The proprietor may only enter the resident’s room, at a reasonable time, with reasonable notice and on reasonable grounds. Agreed access and notice periods are set out below. If the third column is left blank, the suggested notice periods in the second column apply.'
export const BH_CLAUSE_5_FOOTNOTE =
  '* Immediate access is likely to be necessary in this situation for safety reasons.'

export const BH_ACCESS_ROWS: Array<{ reason: string; suggested: string }> = [
  { reason: 'In an emergency, or to carry out emergency repairs or inspections', suggested: 'Immediate access*' },
  { reason: 'To clean the premises', suggested: '24 hours' },
  { reason: 'To carry out repairs', suggested: '24 hours' },
  { reason: 'To show the room to a prospective resident', suggested: '24 hours' },
  { reason: 'To carry out inspections', suggested: '48 hours' },
]

export const BH_CLAUSE_6_HEADING = '6. Notice of Fee Increase (occupancy principle 6)'
export const BH_CLAUSE_6_BODY =
  'The resident is entitled to 4 weeks written notice of any increase in the occupancy fee.'

export const BH_CLAUSE_7_HEADING = '7. Utility Charges (occupancy principle 7)'
export const BH_CLAUSE_7_BODY_1 =
  'The proprietor may charge an additional amount for utilities if the resident is made aware of this on signing this agreement. Details of the charge, including how the charge will be calculated, are included in Annexure 2, and Annexure 2 must be signed and dated by the resident and the proprietor.'
export const BH_CLAUSE_7_BODY_2 =
  'Charges for utilities must be based on the cost to the proprietor of providing the utility and a reasonable measure or estimate of the resident’s use of that utility.'

export const BH_CLAUSE_8_HEADING = '8. Security Deposit (occupancy principle 8)'
export const BH_CLAUSE_8_BODY_PREFIX = 'A security deposit of '
export const BH_CLAUSE_8_BODY_SUFFIX =
  ' is payable to the proprietor, this amount being no more than the sum of two (2) weeks occupancy fee. The security deposit is payable on the day the agreement is signed or on the following day. The security deposit will be repaid to the resident (or the resident’s authorised representative) within 14 days after the end of this agreement, less any amount necessary to cover:'
export const BH_CLAUSE_8_BULLETS = [
  'the reasonable cost of repairs to the boarding house or goods within the boarding house, as a result of damage (other than fair wear or tear) caused by the resident or their guest;',
  'any occupancy fee or other charges owing and payable under this Agreement or the Boarding Houses Act;',
  'the reasonable cost of cleaning any part of the premises occupied by the resident and not left reasonably clean by the resident, having regard to the condition of that part of the premises at the commencement of the occupancy; and',
  'the reasonable cost of replacing locks or other security devices altered, removed or added by the resident without the consent of the proprietor.',
] as const

export const BH_CLAUSE_9_HEADING = '9. Dispute Resolution (occupancy principle 11)'
export const BH_CLAUSE_9_BODY =
  'The proprietor and the resident agree to use their best endeavours to informally resolve any disputes between them through reasonable discussion and negotiation. Either party may apply to the NSW Civil and Administrative Tribunal (NCAT) to resolve a dispute about the Occupancy Principles (see Annexure 1).'

export const BH_CLAUSE_10_HEADING = '10. Written Receipts (occupancy principle 12)'
export const BH_CLAUSE_10_BODY =
  'The proprietor agrees to provide the resident with a written receipt for all money paid to the proprietor, including money paid for occupancy fees, a security deposit and for any utility charges. The receipt should be provided within a reasonable time period after the payment is received.'

export const BH_CLAUSE_11_HEADING = '11. Termination (occupancy principles 9 and 10)'
export const BH_CLAUSE_11_INTRO_1 =
  'The resident is entitled to know why and how this Occupancy Agreement may be terminated, and how much notice will be given before termination. The resident may not be evicted without reasonable written notice from the proprietor.'
export const BH_CLAUSE_11_INTRO_2 =
  'This Agreement can also be terminated by the resident by written notice given to the proprietor. Agreed reasons for termination and notice periods are set out below. If the third column is left blank, the suggested notice periods in the second column apply.'
export const BH_CLAUSE_11_PROP_FOOTNOTE =
  '* Immediate termination is likely to be necessary in this situation in order to protect other residents and employees.'

export const BH_PROP_TERM_ROWS: Array<{ reason: string; suggested: string }> = [
  {
    reason: 'Violence or threats of violence towards anyone living or working in or visiting the premises',
    suggested: 'Immediate*',
  },
  {
    reason: 'Wilfully causing damage to the premises, or using the premises for an illegal purpose',
    suggested: '1 day',
  },
  {
    reason: 'Continued and serious breach of this Agreement or the house rules, following a written warning',
    suggested: '3 days',
  },
  {
    reason: 'Continued minor breach of this Agreement or the house rules, following a written warning',
    suggested: '1 week',
  },
  { reason: 'Non-payment of the occupancy fee', suggested: '2 weeks' },
  {
    reason: 'Any other reason, including vacant possession required and “no grounds” termination',
    suggested: '4 weeks',
  },
]

export const BH_RES_TERM_ROWS: Array<{ reason: string; suggested: string }> = [
  { reason: 'Serious breach of Agreement by proprietor', suggested: '1 day' },
  { reason: 'Minor breach of agreement by proprietor', suggested: '1 week' },
  { reason: 'No grounds / any other reason', suggested: '1 week' },
]

export const BH_CLAUSE_12_HEADING = '12. Use of the Premises'
export const BH_CLAUSE_12_BODY =
  'The resident agrees not to wilfully or negligently cause damage to the premises or to use the premises for an illegal purpose and to respect other residents’ rights to quiet enjoyment of the premises.'

export const BH_NOTE =
  'NOTE: Any term of this Agreement is not enforceable if it is inconsistent with the Occupancy Principles set out in Schedule 1 of the Boarding Houses Act 2012. The Occupancy Principles are attached at Annexure 1.'

export const BH_CROWN = '© State of New South Wales through NSW Fair Trading.'

export const BH_ANNEXURE_1_TITLE = 'Annexure 1 — Occupancy Principles'
export const BH_ANNEXURE_1_INTRO =
  'These principles are contained in Schedule 1 of the Boarding Houses Act 2012 and apply to residents of NSW boarding houses covered by the Act.'

export const BH_PRINCIPLES = [
  '1. State of premises — A resident is entitled to live in premises that are: (a) reasonably clean, (b) in a reasonable state of repair, and (c) reasonably secure.',
  '2. Rules of the boarding house — A resident is entitled to know the rules of the registrable boarding house before moving in.',
  '3. Penalties for breaches prohibited — A resident may not be required to pay a penalty for a breach of the occupancy agreement or the rules of the boarding house.',
  '4. Quiet enjoyment — A resident is entitled to quiet enjoyment of the premises.',
  '5. Inspections and repairs — A proprietor is entitled to enter the premises at a reasonable time on reasonable grounds to carry out inspections or repairs and for other reasonable purposes.',
  '6. Notice of increase of occupancy fee — A resident is entitled to 4 weeks written notice before the proprietor increases the occupancy fee.',
  '7. Utility charges — The proprietor may charge a resident an additional amount for a utility (electricity, gas, oil, water, or another prescribed service) only if the resident was notified before or when entering the agreement, and the amount is based on the proprietor’s cost of providing the utility and a reasonable measure or estimate of the resident’s use.',
  '8. Payment of security deposits — A security deposit may be required only if it does not exceed 2 weeks occupancy fee and is payable on or after the day the resident enters the agreement. Within 14 days after the end of the agreement the proprietor must repay it, less amounts necessary to cover: reasonable repair of damage (beyond fair wear and tear) by the resident or an invitee; occupancy fees or charges owing; reasonable cleaning; and reasonable cost of replacing locks/security devices altered without consent. The proprietor may retain the whole deposit if those costs equal or exceed it.',
  '9. Information about occupancy termination — A resident is entitled to know why and how the occupancy may be terminated, including how much notice will be given before eviction.',
  '10. Notice of eviction — A resident must not be evicted without reasonable written notice. In determining reasonable notice, the proprietor may take into account the safety of other residents, the proprietor and the manager (this does not limit other relevant circumstances).',
  '11. Use of alternative dispute resolution — A proprietor and resident should try to resolve disputes using reasonable dispute resolution processes.',
  '12. Provision of written receipts — A resident must be given a written receipt for any money paid to the proprietor or a person on behalf of the proprietor.',
] as const

export const BH_ANNEXURE_2_TITLE = 'Annexure 2 — Schedule of Additional Charges'
export const BH_ANNEXURE_2_INTRO =
  'For use only if there are fees or charges in addition to the occupancy fee. This schedule forms part of the Occupancy Agreement when signed and dated by both parties. A receipt must be provided to the resident for all such payments within a reasonable time. Utility charges must comply with Occupancy Principle 7.'

export const BH_HOUSE_RULES_TITLE = 'Statement of House Rules'
export const BH_HOUSE_RULES_INTRO =
  'The resident agrees to comply with the House Rules of the boarding house. House rules may not be inconsistent with the Occupancy Principles stated in Annexure 1, and are not enforceable if they are inconsistent.'

/** Distinctive locked phrases that must appear in the generated PDF text. */
export const NSW_BOARDING_HOUSE_PDF_MARKERS = [
  BH_TITLE,
  BH_SUBTITLE,
  BH_CLAUSE_1_BODY,
  BH_CLAUSE_2_BODY,
  BH_CLAUSE_3_BODY,
  BH_CLAUSE_4_BODY,
  BH_CLAUSE_5_INTRO_2,
  BH_CLAUSE_6_BODY,
  BH_CLAUSE_7_BODY_2,
  'this amount being no more than the sum of two (2) weeks occupancy fee',
  BH_CLAUSE_9_BODY,
  BH_CLAUSE_10_BODY,
  BH_CLAUSE_11_INTRO_1,
  BH_CLAUSE_12_BODY,
  BH_NOTE,
  BH_CROWN,
  BH_ANNEXURE_1_INTRO,
  BH_PRINCIPLES[0],
  BH_PRINCIPLES[10],
  BH_HOUSE_RULES_TITLE,
] as const
