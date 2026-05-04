/**
 * Presentation layer: turns structured bond rules into bond-step UI strings.
 * Paragraphs live here, not on TenancyBondRules.
 */
import type { TenancyBondRules } from './rules/types.js'

export interface BondRegulatoryCopy {
  mode: 'landlord_held' | 'scheme'
  /** Leading sentence for statutory bond cap (NSW only today); null to omit */
  bondCapFragment: string | null
  landlordHeldParagraphs: string[]
  schemeLeadBeforeBold: string
  schemeBoldDeadline: string
  schemeLeadAfterBold: string
  authorityStateHeading: string
  authorityPublicLine: string
  amberTitle: string
  amberBody: string
  acknowledgementCheckbox: string
}

/**
 * @param stateCode — Australian state, e.g. property.state (uppercased inside)
 */
export function bondStepRegulatoryCopy(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
): BondRegulatoryCopy {
  const st = (stateCode || 'NSW').toUpperCase()
  const bondCapFragment = st === 'NSW' ? ' Under NSW law, bond cannot exceed 4 weeks rent.' : null

  if (!bond.schemeApplies) {
    return {
      mode: 'landlord_held',
      bondCapFragment,
      landlordHeldParagraphs: [
        'As this is a boarding/lodger arrangement, the Residential Tenancies Act does not apply. Your bond is held directly by your landlord and is not required to be lodged with NSW Fair Trading.',
        'We strongly recommend getting a written receipt when you pay your bond, and keeping a copy for your records.',
        'Your landlord can generate an official bond receipt through their Quni Living dashboard.',
      ],
      schemeLeadBeforeBold: '',
      schemeBoldDeadline: '',
      schemeLeadAfterBold: '',
      authorityStateHeading: '',
      authorityPublicLine: '',
      amberTitle: '',
      amberBody: '',
      acknowledgementCheckbox: `I understand the bond is paid directly to my landlord and will not be lodged with ${bond.landlordAckAuthorityName ?? 'NSW Fair Trading'}.`,
    }
  }

  const days = bond.lodgementDays ?? 10
  return {
    mode: 'scheme',
    bondCapFragment,
    landlordHeldParagraphs: [],
    schemeLeadBeforeBold: 'Your landlord is legally required to lodge your bond with the relevant state authority within ',
    schemeBoldDeadline: `${days} business days`,
    schemeLeadAfterBold: '.',
    authorityStateHeading: `${st} — state bond authority`,
    authorityPublicLine: bond.authorityPublicLabel ?? '',
    amberTitle: 'Always get a receipt when you pay your bond.',
    amberBody: 'Never pay a bond without receiving official confirmation of lodgement from the state authority.',
    acknowledgementCheckbox:
      'I understand the bond is paid directly to my landlord and must be lodged with the relevant state authority.',
  }
}
