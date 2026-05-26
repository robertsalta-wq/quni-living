/**
 * Occupancy / co-tenant fields for lease PDF generators (NSW RTA, QLD Form 18a, occupancy agreements).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
 * @param {{ occupant_count?: unknown, housemates_count?: unknown } | null | undefined} booking
 * @param {{ max_occupants?: unknown } | null | undefined} property
 * @returns {number}
 */
export function maxOccupantsPermittedForLease(booking, property) {
  const propMax = Math.floor(Number(property?.max_occupants))
  if (Number.isFinite(propMax) && propMax >= 1) return Math.min(10, propMax)

  const occ = Math.floor(Number(booking?.occupant_count))
  if (Number.isFinite(occ) && occ >= 1) return Math.min(10, occ)

  const hm = booking?.housemates_count
  if (hm != null && Number.isFinite(Number(hm))) {
    return Math.max(1, Math.min(10, Math.floor(Number(hm)) + 1))
  }

  return 1
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
 * @param {{ co_tenant?: unknown } | null | undefined} booking
 * @returns {{ coTenant: object | null, additionalTenantNames: string[], maxOccupantsPermitted: number, specialConditions: string[] }}
 */
export function occupancyLeaseFieldsFromBooking(booking, property) {
  const coTenant = parseCoTenantFromBooking(booking?.co_tenant)
  return {
    coTenant,
    additionalTenantNames: additionalTenantNamesFromBooking(booking),
    maxOccupantsPermitted: maxOccupantsPermittedForLease(booking, property),
    specialConditions: coTenantSpecialConditionsLines(coTenant),
  }
}
