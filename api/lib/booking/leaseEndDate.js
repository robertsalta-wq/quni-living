/**
 * Lease end-date from move-in + lease_length (weeks-based; matches listing PDF generators).
 */

export const ALLOWED_LEASE_TERMS = ['3 months', '6 months', '12 months', '2 years', 'Flexible']

/**
 * @param {string | null | undefined} leaseLength
 * @returns {boolean}
 */
export function isPeriodicLeaseLength(leaseLength) {
  return typeof leaseLength === 'string' && leaseLength.trim() === 'Flexible'
}

/**
 * @param {string} moveInIso
 * @param {string | null | undefined} leaseLength
 * @returns {string | null} yyyy-mm-dd end date, or null for Flexible / invalid input
 */
export function leaseEndDateFromMoveIn(moveInIso, leaseLength) {
  if (isPeriodicLeaseLength(leaseLength)) return null

  const raw = typeof moveInIso === 'string' ? moveInIso.slice(0, 10) : ''
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return null

  const start = new Date(Date.UTC(y, m - 1, d))
  let weeks = 52
  if (leaseLength === '3 months') weeks = 13
  else if (leaseLength === '6 months') weeks = 26
  else if (leaseLength === '12 months') weeks = 52
  else if (leaseLength === '2 years') weeks = 104

  const end = new Date(start.getTime() + weeks * 7 * 86400000)
  return end.toISOString().slice(0, 10)
}
