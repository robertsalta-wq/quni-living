/**
 * VIC on-site licence to occupy - narrative copy (T1 boarder/lodger).
 */
import type { LicenceOccupyContent } from '../licenceOccupy/contentTypes.js'

export const VIC_LICENCE_OCCUPY_CONTENT: LicenceOccupyContent = {
  docTitle: 'Licence to Occupy',
  docSubtitle: 'Victoria - Licence to occupy (on-site accommodation)',
  draftFooter: 'Draft for legal review - not for execution',
  natureParagraphs: [
    'This document is a common-law licence to occupy a specified room within residential premises in Victoria. It is not a residential tenancy agreement.',
    'The owner named in the schedule resides on the premises and retains overall control, possession and management of the whole property, including shared areas and the allocated room.',
    'The resident is granted permission to occupy only the allocated room described in the schedule and to use the shared areas on the terms below. The resident is not granted exclusive possession of the premises or any part of the premises.',
    'The Residential Tenancies Act 1997 (Vic) does not apply to this arrangement. No security deposit under this licence is lodged with the Residential Tenancies Bond Authority (RTBA).',
  ],
  roomSharedIntro:
    'The resident is licensed to occupy the allocated bedroom at the property address in the schedule. Unless otherwise agreed in writing, the kitchen, bathroom, laundry and living areas are shared with the owner and any other occupants the owner permits on the premises.',
  entryParagraphs: [
    'Because the resident does not have exclusive possession, the owner may enter the allocated room at reasonable times for cleaning, maintenance, inspection or to fulfil the owner\'s obligations under this licence, without the notice requirements that apply to residential tenancies.',
    'The owner retains keys or other means of access to the allocated room. The resident must not change locks or security devices without the owner\'s prior written consent.',
    'The resident must not represent that they have sole or exclusive occupation of the premises or exclude the owner from the allocated room or shared areas.',
  ],
  utilitiesDefault:
    'Unless otherwise agreed in writing or stated in the schedule, electricity, gas, water, internet and waste services for the premises are as described on the property listing or in move-in information. Shared utilities are allocated fairly between occupants as the owner directs.',
  bond: {
    scheduleLabel: 'Security deposit',
    sectionTitle: 'Security deposit',
    intro:
      'Where a security deposit is agreed, it is held directly by the owner and is not lodged with any statutory bond authority.',
    bullets: [
      'The owner must give the resident a written receipt when the security deposit is paid.',
      'The security deposit may be applied against amounts owing under this licence, damage beyond fair wear and tear, or cleaning required to restore the allocated room and the resident\'s share of shared areas, subject to any agreement between the parties.',
      'Unused amounts of the security deposit must be returned to the resident within a reasonable time after the licence ends and the resident has vacated, less lawful deductions.',
    ],
  },
  terminationIntro:
    'Either party may end this licence by giving the other party written notice. The notice period must be reasonable and aligned to how the weekly licence fee is paid:',
  terminationGrounds: [
    'Non-payment of the licence fee or other agreed charges after written reminder.',
    'Serious breach of this licence or the house rules (including damage, nuisance, or unsafe conduct).',
    'Mutual agreement in writing.',
    'Where the owner requires the premises for genuine change of circumstances, subject to the agreed notice period.',
  ],
  terminationNoStatutory:
    'This licence is not governed by the Residential Tenancies Act 1997 (Vic). The parties do not rely on prescribed residential tenancy notice periods or tribunal pathways under that Act.',
  aclParagraph:
    'Although the Residential Tenancies Act 1997 (Vic) does not apply, this licence is a consumer contract for the purposes of the Australian Consumer Law (Cth) as applied in Victoria. Terms that are unfair within the meaning of that law may be void. Neither party may engage in misleading or deceptive conduct in connection with this licence.',
  defaultHouseRules: [
    'Guests and overnight visitors: reasonable notice to the owner; no guest may stay more than 7 consecutive nights without the owner\'s written consent.',
    'Noise: respect quiet hours (typically 10:00 pm – 7:00 am) and other occupants.',
    'Cleaning: keep the allocated room clean; leave shared areas tidy after use; follow any weekly cleaning arrangement stated in the schedule.',
    'Smoking: only where permitted by the owner and outside shared enclosed areas unless otherwise agreed.',
    'Pets: only with the owner\'s prior written consent.',
    'Common areas: shared fairly; do not monopolise kitchen, bathroom or living areas.',
    'Utilities: use services responsibly; report faults promptly to the owner.',
  ],
  careBullets: [
    'Keep the allocated room and shared areas the resident uses in a reasonably clean condition.',
    'Report damage, maintenance needs or safety concerns to the owner promptly.',
    'Must not intentionally or negligently damage the premises or cause nuisance to the owner or other occupants.',
  ],
  disputesParagraph:
    'The parties will attempt to resolve any dispute about this licence in good faith. If the dispute is not resolved within 14 days, either party may refer the matter to a court of Victoria with jurisdiction. Nothing in this clause requires application to VCAT under the Residential Tenancies Act 1997 (Vic).',
  conditionReportIntro:
    'The parties acknowledge that an ingoing condition report may be prepared for the allocated room and shared areas. The resident will be given a reasonable opportunity to review and comment on the report and to attach photographs where appropriate.',
  conditionReportReturn:
    'The resident should return a signed copy or written comments within the timeframe notified by the owner or the platform, failing which the report may be taken as accepted except for manifest errors or items the resident could not reasonably have inspected.',
  conditionReportOutgoing:
    'At the end of the licence, an outgoing condition report may be used to compare the state of the allocated room and shared areas with the ingoing report, fair wear and tear excepted.',
  feeFreeBankTransfer:
    'A fee-free direct bank transfer option remains available at all times for payment of the weekly licence fee. The resident is not required to pay Quni platform fees, booking fees or resident service fees, and the agreed weekly licence fee is not increased by the owner-side service fee described below.',
  bankDetailsTemplate:
    'Direct credit details for payment of the weekly licence fee will be provided by the owner (account name, BSB and account number). Use your name and the property address as the payment reference.',
  platformIntroPrefix:
    'operates an online marketplace and payment facilitation service. The Platform is not the owner, property manager or agent for the premises unless separately appointed in writing. The owner remains responsible for the allocated room, shared areas and this licence.',
  executionIntro:
    'The parties intend that electronic signing, where used, is valid and binding. Signature and date fields may be completed through a future signing workflow.',
}
