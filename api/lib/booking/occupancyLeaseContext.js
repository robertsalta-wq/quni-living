/**
 * Occupancy / co-tenant fields for lease PDF generators (NSW RTA, QLD Form 18a, occupancy agreements).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class MissingBookingOccupantCountError extends Error {
  constructor() {
    super(
      'Booking occupant_count is required to set the lease maximum occupants cap (FT6600 / agreement schedule).',
    )
    this.name = 'MissingBookingOccupantCountError'
  }
}

/**
 * @param {unknown} raw
 * @returns {{ full_name: string, email: string, phone: string, date_of_birth: string } | null}
 */
export function parseCoTenantFromBooking(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const full_name = typeof raw.full_name === 'string' ? raw.full_name.trim() : ''
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : ''
  const date_of_birth =
    typeof raw.date_of_birth === 'string' ? raw.date_of_birth.trim().slice(0, 10) : ''
  if (full_name.length < 2 || !EMAIL_RE.test(email)) return null
  return { full_name, email, phone, date_of_birth }
}

/**
 * @param {{ co_tenant?: unknown } | null | undefined} booking
 * @returns {string[]}
 */
export function additionalTenantNamesFromBooking(booking) {
  const ct = parseCoTenantFromBooking(booking?.co_tenant)
  return ct ? [ct.full_name] : []
}

/**
 * Lease agreement max-occupants cap - booking.occupant_count only (never property.max_occupants).
 *
 * @param {{ occupant_count?: unknown } | null | undefined} booking
 * @returns {number}
 */
export function maxOccupantsPermittedForLease(booking) {
  const occ = Math.floor(Number(booking?.occupant_count))
  if (Number.isFinite(occ) && occ >= 1) return Math.min(10, occ)
  throw new MissingBookingOccupantCountError()
}

/**
 * @param {{ full_name: string, email?: string, phone?: string, date_of_birth?: string } | null} coTenant
 * @returns {string[]}
 */
export function coTenantSpecialConditionsLines(coTenant) {
  if (!coTenant?.full_name) return []
  const lines = [`Co-occupant named on this tenancy: ${coTenant.full_name}.`]
  if (coTenant.date_of_birth) {
    lines.push(`Co-occupant date of birth: ${coTenant.date_of_birth}.`)
  }
  if (coTenant.email) {
    lines.push(`Co-occupant email: ${coTenant.email}.`)
  }
  if (coTenant.phone) {
    lines.push(`Co-occupant phone: ${coTenant.phone}.`)
  }
  return lines
}

/**
 * @param {{ co_tenant?: unknown, occupant_count?: unknown } | null | undefined} booking
 * @param {Record<string, unknown> | null | undefined} [_property] Unused; listing capacity stays on property.max_occupants elsewhere.
 * @returns {{ coTenant: object | null, additionalTenantNames: string[], maxOccupantsPermitted: number, specialConditions: string[] }}
 */
export function occupancyLeaseFieldsFromBooking(booking, _property) {
  const coTenant = parseCoTenantFromBooking(booking?.co_tenant)
  return {
    coTenant,
    additionalTenantNames: additionalTenantNamesFromBooking(booking),
    maxOccupantsPermitted: maxOccupantsPermittedForLease(booking),
    specialConditions: coTenantSpecialConditionsLines(coTenant),
  }
}
