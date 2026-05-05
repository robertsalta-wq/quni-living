/**
 * Presentation layer: turns structured bond rules into bond-step UI strings.
 * Paragraphs live here, not on TenancyBondRules.
 */
import type { TenancyBondRules } from './rules/types.js'

export interface BondRegulatoryCopy {
  mode: 'landlord_held' | 'scheme'
  /** Leading statutory bond-cap sentence after bond amount; null to omit */
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

function bondCapFragmentFromBond(bond: TenancyBondRules): string | null {
  if (!bond.schemeApplies) return null
  return bond.maxBondCopy ? ` ${bond.maxBondCopy}` : null
}

/**
 * @param stateCode — Australian state, e.g. property.state (uppercased inside)
 */
export function bondStepRegulatoryCopy(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
): BondRegulatoryCopy {
  const st = (stateCode || 'NSW').toUpperCase()

  if (!bond.schemeApplies) {
    return {
      mode: 'landlord_held',
      bondCapFragment: bondCapFragmentFromBond(bond),
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

  const days = bond.lodgementDays
  const lodgementUnit = bond.lodgementDaysUnit
  const schemeBoldDeadline =
    lodgementUnit === 'calendar' ? `${days} days` : `${days} business days`
  return {
    mode: 'scheme',
    bondCapFragment: bondCapFragmentFromBond(bond),
    landlordHeldParagraphs: [],
    schemeLeadBeforeBold: 'Your landlord is legally required to lodge your bond with the relevant state authority within ',
    schemeBoldDeadline,
    schemeLeadAfterBold: '.',
    authorityStateHeading: `${st} — state bond authority`,
    authorityPublicLine: bond.authorityPublicLabel,
    amberTitle: 'Always get a receipt when you pay your bond.',
    amberBody: 'Never pay a bond without receiving official confirmation of lodgement from the state authority.',
    acknowledgementCheckbox:
      'I understand the bond is paid directly to my landlord and must be lodged with the relevant state authority.',
  }
}

const FALLBACK_AUTHORITY_PUBLIC_LABEL: Record<string, string> = {
  NSW: 'NSW Fair Trading (Rental Bonds Online)',
  VIC: 'Residential Tenancies Bond Authority (RTBA)',
  QLD: 'Residential Tenancies Authority (RTA)',
  WA: 'Bond Administrator, Dept of Mines',
  SA: 'Consumer and Business Services',
  ACT: 'ACT Revenue Office',
  TAS: 'Consumer, Building and Occupational Services',
  NT: 'NT Consumer Affairs',
}

/** Public bond authority line when `resolveTenancyPackage` is unsupported (no rules object). */
export function fallbackBondAuthorityPublicLine(state: string | null | undefined): string {
  const s = (state ?? 'NSW').toUpperCase()
  return FALLBACK_AUTHORITY_PUBLIC_LABEL[s] ?? FALLBACK_AUTHORITY_PUBLIC_LABEL.NSW
}

/**
 * Bold fragment for the statutory lodgement period when rules are unavailable (e.g. unknown property type).
 * QLD uses calendar days; NSW/VIC use business days for the usual 10-day window.
 */
export function fallbackSchemeLodgementDeadlineBold(state: string | null | undefined): string {
  const s = (state ?? 'NSW').toUpperCase()
  if (s === 'QLD') return '10 days'
  return '10 business days'
}
