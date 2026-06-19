export function parsePropertyBondAud(value: unknown): number | null
export function bondAmountAtApplyFromProperty(property: { bond?: unknown }): number | null
export function resolveBookingBondAmountAud(
  bookingBond: unknown,
  propertyBond: unknown,
  weeklyRent: unknown,
): number | null
export function recomputeBondForAgreedRent(
  propertyBondAud: number,
  applyWeeklyRentAud: number,
  agreedWeeklyRentAud: number,
): number
export function statutoryBondCapAudForOverride(
  pkg: {
    supported?: boolean
    tier?: string
    rules?: { bond?: { schemeApplies?: boolean; maxBondMonths?: number | null } | null } | null
  },
  agreedWeeklyRentAud: number,
): number | null
