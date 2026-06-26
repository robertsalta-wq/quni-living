/**
 * NSW on-site licence to occupy - narrative copy (lawyer-review draft).
 * Boarder/lodger; Principal-held security deposit (no NSW Fair Trading lodgement for T1).
 */
import type { LicenceOccupyContent } from '../licenceOccupy/contentTypes.js'
import { LICENCE_OCCUPY_WATERMARK } from '../licenceOccupy/watermark.js'

export const NSW_LICENCE_OCCUPY_CONTENT: LicenceOccupyContent = {
  docTitle: 'Licence to Occupy',
  docSubtitle: 'New South Wales - Licence to occupy (on-site accommodation)',
  draftFooter: LICENCE_OCCUPY_WATERMARK,
  watermark: LICENCE_OCCUPY_WATERMARK,
  partyLabel: 'Principal',
  natureParagraphs: [
    'This document is a common-law licence to occupy a specified room within residential premises in New South Wales. It is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW).',
    'In this licence, "Principal" means the person named as Principal in the schedule, being a person who resides on the premises and who either owns the premises or otherwise has a lawful right to grant occupation of the allocated room or space and to retain control of the premises.',
    'The Principal named in the schedule resides on the premises and retains overall control, possession and management of the whole property, including shared areas and the allocated room.',
    'The resident is granted permission to occupy only the allocated room described in the schedule and to use the shared areas on the terms below. The resident is not granted exclusive possession of the premises or any part of the premises.',
    'The Residential Tenancies Act 2010 (NSW) does not apply to this boarder/lodger arrangement. Any security deposit is held directly by the Principal and is not lodged with NSW Fair Trading or Rental Bonds Online.',
  ],
  roomSharedIntro: '',
  roomSharedParagraphs: [
    'The resident is licensed to occupy the allocated room or, where the schedule specifies a shared room, the allocated bed or space within that room. Where the room is shared, the resident shares it with other residents the Principal permits, and the Principal may place another resident in the same room.',
    'Unless otherwise agreed in writing, the kitchen, bathroom, laundry and living areas are shared with the Principal and any other occupants the Principal permits on the premises.',
  ],
  entrySectionTitle: "Principal's right of entry",
  entryParagraphs: [
    'Because the resident does not have exclusive possession, the Principal may enter the allocated room at reasonable times for cleaning, maintenance, inspection or to fulfil the Principal\'s obligations under this licence, without the notice requirements that apply to residential tenancies.',
    'The Principal retains keys or other means of access to the allocated room. The resident must not change locks or security devices without the Principal\'s prior written consent.',
    'The resident must not represent that they have sole or exclusive occupation of the premises or exclude the Principal from the allocated room or shared areas.',
  ],
  utilitiesDefault:
    'Unless otherwise agreed in writing or stated in the schedule, electricity, gas, water, internet and waste services for the premises are as described on the property listing or in move-in information. Shared utilities are allocated fairly between occupants as the Principal directs.',
  bond: {
    scheduleLabel: 'Security deposit',
    sectionTitle: 'Security deposit',
    intro:
      'Where a security deposit is agreed, it is held directly by the Principal and is not lodged with NSW Fair Trading or any statutory bond service.',
    bullets: [
      'The Principal must give the resident a written receipt when the security deposit is paid.',
      'The security deposit may be applied against amounts owing under this licence, damage beyond fair wear and tear, or cleaning required to restore the allocated room and the resident\'s share of shared areas, subject to any agreement between the parties.',
    ],
    afterBullets: [
      'The Principal must refund the security deposit (less any amount lawfully applied under this clause) within 14 days after the later of: the date the resident vacates the room or space and returns all keys; or the date the outgoing condition report is completed.',
      'If the Principal proposes to apply any part of the deposit, the Principal must give the resident an itemised written statement of the proposed deductions within 14 days after the later of those same events.',
      'If the resident disputes a proposed deduction, the parties must attempt to resolve the matter in accordance with clause 10.',
    ],
  },
  terminationIntro: '',
  terminationGrounds: [],
  terminationSectionTitle: 'Term and termination',
  terminationBlocks: [
    {
      kind: 'paragraph',
      text: 'This licence is for the fixed period stated in the schedule. Subject to the early-termination provisions below, each party commits to the licence for that period.',
    },
    {
      kind: 'bullets',
      intro: 'Either party may end the licence immediately where:',
      items: [
        'the licence fee or other agreed charges remain unpaid and the resident has not paid them within 3 days after a written reminder;',
        'there is a serious breach of this licence or the house rules (including damage, nuisance or unsafe conduct); or',
        'the parties agree in writing.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'Early termination by the resident. The resident may end this licence before the end of the fixed period by giving the Principal at least two weeks\' written notice. The resident remains liable for the weekly licence fee until the earlier of the end of that notice period and the date a replacement resident begins paying for the allocated room or space. The Principal must take reasonable steps to re-licence the room or space and must not unreasonably refuse a suitable replacement.',
    },
    {
      kind: 'paragraph',
      text: 'Early termination by the Principal. The Principal may end this licence before the end of the fixed period on at least four weeks\' written notice where the Principal requires the premises because of a genuine change of circumstances.',
    },
  ],
  terminationNoStatutory:
    'This licence is not governed by the Residential Tenancies Act 2010 (NSW). The parties do not rely on prescribed residential tenancy notice periods or NCAT pathways under that Act.',
  aclParagraph:
    'Although the Residential Tenancies Act 2010 (NSW) does not apply, this licence is a consumer contract for the purposes of the Australian Consumer Law (Cth) as applied in New South Wales. Terms that are unfair within the meaning of that law may be void. Neither party may engage in misleading or deceptive conduct in connection with this licence.',
  houseRulesIntro:
    'The resident must comply with the following house rules. Additional rules may be notified by the Principal in writing.',
  houseRulesPrecedenceParagraph:
    'The House Rules are operational only. They form part of this licence but are subordinate to its operative clauses, and do not create rights or obligations inconsistent with the licence. If anything in the House Rules conflicts with the operative clauses, the operative clauses prevail.',
  defaultHouseRules: [
    'Guests and overnight visitors: reasonable notice to the Principal; no guest may stay more than 7 consecutive nights without the Principal\'s written consent.',
    'Noise: respect quiet hours (typically 10:00 pm – 7:00 am) and other occupants.',
    'Cleaning: keep the allocated room clean; leave shared areas tidy after use; follow any weekly cleaning arrangement stated in the schedule.',
    'Smoking: only where permitted by the Principal and outside shared enclosed areas unless otherwise agreed.',
    'Pets: only with the Principal\'s prior written consent.',
    'Common areas: shared fairly; do not monopolise kitchen, bathroom or living areas.',
    'Utilities: use services responsibly; report faults promptly to the Principal.',
  ],
  careBullets: [
    'Keep the allocated room and shared areas the resident uses in a reasonably clean condition.',
    'Report damage, maintenance needs or safety concerns to the Principal promptly.',
    'Must not intentionally or negligently damage the premises or cause nuisance to the Principal or other occupants.',
  ],
  disputesParagraph: '',
  disputesParagraphs: [
    'If a dispute arises about this licence, the parties will use their best efforts to resolve it through good faith discussion within 14 days of one party notifying the other in writing.',
    'This licence is not a residential tenancy agreement under the Residential Tenancies Act 2010 (NSW), and neither party may apply to the NSW Civil and Administrative Tribunal in respect of this licence.',
    'Nothing in this clause limits any right a party would otherwise have at law.',
  ],
  conditionReportIntro: '',
  conditionReportReturn: '',
  conditionReportOutgoing: '',
  conditionReportParagraphs: [
    'The Principal will prepare an ingoing condition report for the allocated room or space and shared areas, supported by photographs, at or before the start of the licence. The resident will be given a reasonable opportunity to review and comment on the report and to attach their own photographs where appropriate.',
    'The resident should return a signed copy or written comments within the timeframe notified by the Principal or the Platform, failing which the report may be taken as accepted except for manifest errors or items the resident could not reasonably have inspected. At the end of the licence, an outgoing condition report will be used to compare the state of the allocated room or space and shared areas with the ingoing report, fair wear and tear excepted. Any deduction from the security deposit for damage should be supported by these reports.',
  ],
  continuationParagraphs: [
    'If neither party gives written notice to end this licence before the expiry of the fixed period, the licence continues on a periodic weekly basis on the same terms and conditions.',
    'During any periodic continuation, either party may end this licence by giving written notice in accordance with clause 6 (two weeks for the resident; four weeks for the Principal).',
    'The weekly licence fee and all other obligations under this licence remain unchanged during any periodic continuation unless varied by written agreement of both parties.',
    'For the avoidance of doubt, during any periodic continuation the resident\'s liability on termination is limited to the applicable notice period; the mitigation and re-letting obligations in clause 6 apply only during the fixed period.',
  ],
  feeFreeBankTransfer:
    'A fee-free direct bank transfer option remains available at all times for payment of the weekly licence fee. The resident is not required to pay Quni platform fees, booking fees or resident service fees, and the agreed weekly licence fee is not increased by the Principal-side service fee described below.',
  bankDetailsTemplate:
    'Direct credit details for payment of the weekly licence fee will be provided by the Principal (account name, BSB and account number). Use your name and the property address as the payment reference.',
  platformIntroPrefix:
    'operates an online marketplace and payment facilitation service. The Platform is not the owner, property manager or agent for the premises unless separately appointed in writing. The Principal remains responsible for the allocated room, shared areas and this licence.',
  platformSectionTitle: "Quni platform, Principal's warranty and service fee",
  platformWarrantyParagraph:
    "Principal's warranty. The Principal warrants that they have the right to grant this licence and, where they are not the registered proprietor of the premises, that they hold any consent required from the registered owner, any co-owners, or the Principal's own landlord to grant it. The resident acknowledges that their right to occupy depends on the Principal's continuing right to grant it.",
  executionIntro:
    'The parties intend that electronic signing, where used, is valid and binding under the Electronic Transactions Act 2000 (NSW) and related law. Signature and date fields may be completed through the signing workflow.',
}

/** PDF generation tests search for these strings in the rendered buffer. */
export const NSW_OCCUPANCY_PDF_MARKERS = [
  'Licence to Occupy',
  'Weekly licence fee',
  'Security deposit',
  'Residential Tenancies Act 2010',
  'not lodged with NSW Fair Trading',
  'Quni platform fees, booking fees or resident service fees',
  'Subject to final legal review',
  'Principal',
  'Term and termination',
  'Continuation after fixed period',
] as const
