export const MAX_BOND_WEEKS = 4
export const DEFAULT_BOND_WEEKS = 2

export function parsePropertyBondAud(value: unknown): number | null
export function roundBondAud(n: number): number
export function parseBondWeeks(value: unknown): number | null
export function maxBondCapAud(weeklyRentAud: unknown): number | null
export function assertBondWithinCap(
  bondAmountAud: unknown,
  weeklyRentAud: unknown,
): { ok: true } | { ok: false; message: string }
export function isPropertyBondFixed(property: object | null | undefined): boolean
export function resolveListingBondAud(
  property: object | null | undefined,
  applicableWeeklyRent: unknown,
): number | null
export function resolveInviteBondAud(
  property: object | null | undefined,
  invite: { offered_bond_weeks?: unknown; offered_bond_fixed?: unknown } | null | undefined,
  applicableWeeklyRent: unknown,
): number | null
export function bondAmountAtApplyFromProperty(
  property: object,
  applicableWeeklyRent: unknown,
  invite?: { offered_bond_weeks?: unknown; offered_bond_fixed?: unknown } | null,
): number | null
export function resolveBookingBondAmountAud(
  bookingBond: unknown,
  property: object | null | undefined,
  applicableWeeklyRent: unknown,
): number | null
export function recapFixedBondAud(fixedAud: unknown, applicableWeeklyRentAud: unknown): number
export function effectiveBondConfigFromBreakdown(
  property: object,
  rentBreakdown: unknown,
): { mode: 'weeks' | 'fixed' | 'none'; weeks?: number; fixedAmount?: number }
export function recomputeBondForAgreedRent(
  property: object,
  bookingBondAmount: unknown,
  applyWeeklyRentAud: unknown,
  agreedWeeklyRentAud: unknown,
  rentBreakdown: unknown,
): number | null
export function resolveAcceptanceBondOverrideAud(
  override: { weeks?: number | null; fixed?: number | null },
  applicableWeeklyRentAud: unknown,
): number | null
export function statutoryBondCapAudForOverride(_pkg: unknown, agreedWeeklyRentAud: number): number | null
