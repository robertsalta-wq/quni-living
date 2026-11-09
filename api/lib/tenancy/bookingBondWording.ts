/**
 * Bond and rent sentences for one booking.
 * Same bond rules as the tenancy document generators (resolveTenancyPackage → rules.bond).
 * Residential and QLD occupancy/rooming lodge with that state's authority.
 * NSW and VIC occupancy or boarder deposits are held by the landlord.
 */

export const RENT_TO_LANDLORD_AGREEMENT_LINE =
  'Rent is paid directly to the landlord at the account named in the agreement.'

export type BondAuthorityState = 'NSW' | 'QLD' | 'VIC'

const AUTHORITY_NAME: Record<BondAuthorityState, string> = {
  NSW: 'NSW Fair Trading (Rental Bonds Online)',
  QLD: 'the Residential Tenancies Authority',
  VIC: 'the Residential Tenancies Bond Authority',
}

export type BookingBondWording = {
  state: BondAuthorityState
  lodgementApplies: boolean
  bondLine: string
  rentLine: string
  confirmPhrase: 'confirm once lodged' | 'confirm once received'
}

export function bondAuthorityName(state: string | null | undefined): string | null {
  const st = (state ?? '').trim().toUpperCase()
  if (st === 'NSW' || st === 'QLD' || st === 'VIC') return AUTHORITY_NAME[st]
  return null
}

export function bookingBondWording(input: {
  state: string | null | undefined
  schemeApplies: boolean
}): BookingBondWording | null {
  const st = (input.state ?? '').trim().toUpperCase()
  if (st !== 'NSW' && st !== 'QLD' && st !== 'VIC') return null
  const authority = AUTHORITY_NAME[st]
  const lodgementApplies = input.schemeApplies === true
  const bondLine = lodgementApplies
    ? `Bond is lodged with ${authority}. Pay the authority directly, or pay the landlord, who must lodge it.`
    : `The deposit is held by the landlord and is not lodged with ${authority}.`
  return {
    state: st,
    lodgementApplies,
    bondLine,
    rentLine: RENT_TO_LANDLORD_AGREEMENT_LINE,
    confirmPhrase: lodgementApplies ? 'confirm once lodged' : 'confirm once received',
  }
}

export function bookingBondWordingFromPackage(pkg: {
  supported: boolean
  ragState: string | null
  rules: { bond: { schemeApplies: boolean } } | null
}): BookingBondWording | null {
  if (!pkg.supported || !pkg.rules) return null
  return bookingBondWording({ state: pkg.ragState, schemeApplies: pkg.rules.bond.schemeApplies })
}

export function bookingBondEmailSentences(wording: BookingBondWording | null): string | null {
  if (!wording) return null
  return `${wording.bondLine} ${wording.rentLine}`
}
