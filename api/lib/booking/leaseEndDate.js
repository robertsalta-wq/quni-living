/**
 * One lease clock: calendar months.
 *
 * bookings.end_date is the exclusive end of the half-open window [start, end).
 * The date printed as "ending on" is the inclusive last day, one day earlier.
 * When the start day does not exist in the target month, the exclusive end
 * clamps to that month's last day (31 Jan + 1 month is 28 Feb, or 29 Feb in a leap year).
 * Flexible has no end date.
 */

export const ALLOWED_LEASE_TERMS = ['3 months', '6 months', '12 months', '2 years', 'Flexible']

/** Calendar months for a fixed menu length. Flexible and unknown lengths are absent. */
export const LEASE_LENGTH_CALENDAR_MONTHS = {
  '3 months': 3,
  '6 months': 6,
  '12 months': 12,
  '2 years': 24,
}

/**
 * @param {string | null | undefined} leaseLength
 * @returns {boolean}
 */
export function isPeriodicLeaseLength(leaseLength) {
  return typeof leaseLength === 'string' && leaseLength.trim() === 'Flexible'
}

/**
 * @param {string} isoDate
 * @param {number} days
 * @returns {string | null}
 */
export function addDaysIso(isoDate, days) {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000)
  return dt.toISOString().slice(0, 10)
}

/**
 * Add calendar months, clamping the day to the target month's last day.
 * @param {string} isoDate
 * @param {number} months
 * @returns {string | null}
 */
export function addCalendarMonths(isoDate, months) {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d || !Number.isFinite(months)) return null
  const monthIndex = m - 1 + months
  const targetYear = y + Math.floor(monthIndex / 12)
  const targetMonth = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  return new Date(Date.UTC(targetYear, targetMonth, day)).toISOString().slice(0, 10)
}

/**
 * Exclusive end: start plus N calendar months. Null for Flexible, unknown lengths, and bad dates.
 * @param {string} moveInIso
 * @param {string | null | undefined} leaseLength
 * @returns {string | null}
 */
export function leaseEndDateFromMoveIn(moveInIso, leaseLength) {
  if (isPeriodicLeaseLength(leaseLength)) return null
  const months = LEASE_LENGTH_CALENDAR_MONTHS[typeof leaseLength === 'string' ? leaseLength.trim() : '']
  if (!months) return null
  return addCalendarMonths(moveInIso, months)
}

/**
 * Inclusive last day printed on agreements, emails, and dashboards.
 * @param {string | null | undefined} exclusiveEndIso
 * @returns {string | null}
 */
export function inclusiveLeaseLastDay(exclusiveEndIso) {
  if (typeof exclusiveEndIso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(exclusiveEndIso)) return null
  return addDaysIso(exclusiveEndIso.slice(0, 10), -1)
}

/**
 * Prefer a stored exclusive end. Otherwise compute one. Printed last day is always exclusive minus one day.
 * @param {{ moveInIso: string, leaseLength: string | null | undefined, storedExclusiveEnd?: string | null }} args
 */
export function leaseDatesForBooking(args) {
  const periodic = isPeriodicLeaseLength(args.leaseLength)
  if (periodic) return { exclusiveEnd: null, printedLastDay: null, periodic: true }
  const stored =
    typeof args.storedExclusiveEnd === 'string' && /^\d{4}-\d{2}-\d{2}/.test(args.storedExclusiveEnd)
      ? args.storedExclusiveEnd.slice(0, 10)
      : null
  const exclusiveEnd = stored || leaseEndDateFromMoveIn(args.moveInIso, args.leaseLength)
  return {
    exclusiveEnd,
    printedLastDay: inclusiveLeaseLastDay(exclusiveEnd),
    periodic: false,
  }
}
