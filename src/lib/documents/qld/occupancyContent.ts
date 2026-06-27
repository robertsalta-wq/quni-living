/**
 * Queensland on-site licence to occupy - boarder/lodger; RTA bond lodgement (T1).
 */
import type { LicenceOccupyContent } from '../licenceOccupy/contentTypes.js'
import { LICENCE_OCCUPY_WATERMARK } from '../licenceOccupy/watermark.js'
import {
  QLD_RTA_BOARDERS_LODGERS_URL,
  QLD_RTRA_ACT_SHORT,
  QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS,
} from '../../tenancy/qldBoarderLodger.js'

export const QLD_LICENCE_OCCUPY_CONTENT: LicenceOccupyContent = {
  docTitle: 'Licence to Occupy',
  docSubtitle: 'Queensland - Licence to occupy (on-site accommodation)',
  draftFooter: LICENCE_OCCUPY_WATERMARK,
  watermark: LICENCE_OCCUPY_WATERMARK,
  partyLabel: 'Principal',
  natureParagraphs: [
    `This document is a common-law licence to occupy a specified room within residential premises in Queensland. It is not a residential tenancy agreement (Form 18a) and is not a rooming accommodation agreement (Form R18) under the ${QLD_RTRA_ACT_SHORT} (RTRA Act).`,
    'In this licence, "Principal" means the person named as Principal in the schedule, being a person who resides on the premises and who either owns the premises or otherwise has a lawful right to grant occupation of the allocated room or space and to retain control of the premises.',
    'For boarders and lodgers in Queensland, most of the RTRA Act does not apply to the occupation arrangement itself. Whether a person is a boarder or lodger (rather than a tenant or rooming accommodation resident) depends on the facts, including the degree of control the Principal retains over the premises and shared facilities. RTA Queensland publishes guidance for boarders and lodgers at rta.qld.gov.au.',
    `The Principal named in the schedule resides on the premises and retains overall control, possession and management of the whole property, including shared areas and the allocated room. Where the Principal lives on site and no more than ${QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS} rooms are occupied or available for occupation by residents, the conditions for coverage as rooming accommodation under s 43 are not met, so those provisions do not apply to this arrangement.`,
    'The resident is granted permission to occupy only the allocated room described in the schedule and to use the shared areas on the terms below. The resident is not granted exclusive possession of the premises or any part of the premises.',
    `Although the RTRA Act does not generally apply to this boarder/lodger arrangement, s 32 requires that any bond taken under this licence must be lodged with the Residential Tenancies Authority (RTA Queensland) as described in clause 5. Bond must not be kept in a personal account. Failure to lodge is an offence. See ${QLD_RTA_BOARDERS_LODGERS_URL}.`,
  ],
  roomSharedIntro: '',
  roomSharedParagraphs: [
    'The resident is licensed to occupy the allocated room or, where the schedule specifies a shared room, the allocated bed or space within that room. Where the room is shared, the resident shares it with other residents the Principal permits, and the Principal may place another resident in the same room.',
    'Unless otherwise agreed in writing, the kitchen, bathroom, laundry and living areas are shared with the Principal and any other occupants the Principal permits on the premises.',
  ],
  entrySectionTitle: "Principal's right of entry",
  entryParagraphs: [
    'Because the resident does not have exclusive possession, the Principal may enter the allocated room at reasonable times for cleaning, maintenance, inspection or to fulfil the Principal\'s obligations under this licence, without the notice requirements that apply to general tenancy agreements.',
    'The Principal retains keys or other means of access to the allocated room. The resident must not change locks or security devices without the Principal\'s prior written consent.',
    'The resident must not represent that they have sole or exclusive occupation of the premises or exclude the Principal from the allocated room or shared areas.',
  ],
  utilitiesDefault:
    'Unless otherwise agreed in writing or stated in the schedule, electricity, gas, water, internet and waste services for the premises are as described on the property listing or in move-in information. Shared utilities are allocated fairly between occupants as the Principal directs.',
  bond: {
    scheduleLabel: 'Bond',
    sectionTitle: 'Bond (RTA lodgement)',
    intro:
      'Where a bond is required under this licence, it must not exceed the equivalent of four (4) weeks\' licence fee. The bond must be lodged with the Residential Tenancies Authority (RTA Queensland) and may be lodged either by the resident directly through RTA Web Services, or by the Principal within 10 days of receiving it.',
    bullets: [
      'The bond is held by the RTA — not by the Principal and not by Quni; where Quni\'s payment facilities are used, Quni acts only as a conduit for transmission and is never the custodian of any bond.',
      'The resident should retain evidence of bond payment and official RTA lodgement confirmation.',
      'At the end of the occupancy the bond is dealt with through the RTA\'s Refund of Rental Bond process.',
    ],
    afterBullets: [
      'Any claim by the Principal against the bond will be supported by evidence (including the condition reports and photographs) provided to the resident, and unresolved claims are dealt with through the RTA\'s dispute resolution service and, if necessary, the Queensland Civil and Administrative Tribunal (QCAT).',
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
        'the weekly licence fee or other agreed charges remain unpaid and the resident has not paid them within 3 days after a written reminder;',
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
    'This licence is not governed by the residential tenancy provisions of the RTRA Act 2008 (Qld), except where Queensland law requires bond to be lodged with RTA Queensland. The parties do not rely on prescribed residential tenancy notice periods or RTA tenancy dispute pathways under that Act for matters other than bond lodged with the RTA.',
  aclParagraph:
    'This licence is a consumer contract for the purposes of the Australian Consumer Law (Cth) as applied in Queensland. Terms that are unfair within the meaning of that law may be void. Neither party may engage in misleading or deceptive conduct in connection with this licence.',
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
    'The parties will attempt in good faith to resolve any dispute under this licence by discussion before taking any other step. Where a bond has been lodged with the RTA, the parties acknowledge that any dispute about that bond is dealt with through the RTA\'s dispute resolution service and, if unresolved, the Queensland Civil and Administrative Tribunal, and nothing in this licence purports to exclude that process. For all other matters arising under this licence — this being a boarder/lodger arrangement to which the Residential Tenancies and Rooming Accommodation Act 2008 (Qld) does not apply — the parties\' rights and remedies are governed by the general law, and nothing in this licence submits those matters to the Tribunal\'s residential-tenancy jurisdiction or the RTA\'s tenancy dispute process. Nothing in this clause limits any right or remedy a party has at law or in equity, or any statutory right that cannot lawfully be excluded.',
  ],
  conditionReportIntro: '',
  conditionReportReturn: '',
  conditionReportOutgoing: '',
  conditionReportParagraphs: [
    'The Principal will prepare an ingoing condition report for the allocated room or space and shared areas, supported by photographs, at or before the start of the licence. The resident will be given a reasonable opportunity to review and comment on the report and to attach their own photographs where appropriate.',
    'The resident should return a signed copy or written comments within the timeframe notified by the Principal or the Platform, failing which the report may be taken as accepted except for manifest errors or items the resident could not reasonably have inspected. At the end of the licence, an outgoing condition report will be used to compare the state of the allocated room or space and shared areas with the ingoing report, fair wear and tear excepted.',
    'Where a bond has been lodged, any claim by the Principal against the bond for loss, damage or unpaid weekly licence fees must be supported by the ingoing and outgoing condition reports and photographs provided to the resident, and is dealt with through the RTA\'s Refund of Rental Bond process and dispute resolution service described in clause 5 and the additional terms — not by deduction from amounts held by the Principal. Where no bond has been taken, the Principal may recover any such loss, damage or unpaid weekly licence fees from the resident as a debt, supported by the same condition reports and photographs.',
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
    'The parties intend that electronic signing, where used, is valid and binding under the Electronic Transactions (Queensland) Act 2001 and related law. Signature and date fields may be completed through the signing workflow.',
  docusealSizedSignatureFields: true,
}

/** PDF generation tests search for these strings in the rendered buffer. */
export const QLD_OCCUPANCY_PDF_MARKERS = [
  'Licence to Occupy',
  'Weekly licence fee',
  'Principal',
  'Residential Tenancies Authority',
  'RTA Web Services',
  'Term and termination',
  'Continuation after fixed period',
  'Subject to final legal review',
  'Principal-side service fee',
  's 32',
  'boarders and lodgers',
  's 43',
  'Form R18',
  'boarder or lodger',
  'Electronic Transactions (Queensland) Act 2001',
  'as applied in Queensland',
] as const
