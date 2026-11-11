export const ALLOWED_LEASE_TERMS: readonly string[]

export const LEASE_LENGTH_CALENDAR_MONTHS: Readonly<Record<string, number>>

export function isPeriodicLeaseLength(leaseLength: string | null | undefined): boolean

export function addDaysIso(isoDate: string, days: number): string | null

export function addCalendarMonths(isoDate: string, months: number): string | null

export function leaseEndDateFromMoveIn(
  moveInIso: string,
  leaseLength: string | null | undefined,
): string | null

export function inclusiveLeaseLastDay(exclusiveEndIso: string | null | undefined): string | null

export function leaseDatesForBooking(args: {
  moveInIso: string
  leaseLength: string | null | undefined
  storedExclusiveEnd?: string | null
}): { exclusiveEnd: string | null; printedLastDay: string | null; periodic: boolean }
