/** NSW / QLD only — factual strings for the landlord office page. Never legal answers. */
export type LandlordDeskState = 'NSW' | 'QLD'

export const LANDLORD_DESK_STATES: readonly LandlordDeskState[] = ['NSW', 'QLD']

export type LandlordStateFacts = {
  label: string
  bondScheme: string
  authority: string
  authorityShort: string
}

export const LANDLORD_STATE_FACTS: Record<LandlordDeskState, LandlordStateFacts> = {
  NSW: {
    label: 'New South Wales',
    bondScheme: 'NSW Rental Bonds Online',
    authority: 'NSW Fair Trading',
    authorityShort: 'NSW Fair Trading',
  },
  QLD: {
    label: 'Queensland',
    bondScheme: 'QLD RTA',
    authority: 'Residential Tenancies Authority (RTA Queensland)',
    authorityShort: 'RTA Queensland',
  },
}

export function feeInDays(weeklyRent: number): number {
  const daily = weeklyRent / 7
  if (daily <= 0) return 0
  return Math.round(99 / daily)
}
