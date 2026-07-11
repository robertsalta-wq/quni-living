/**
 * Fail-closed allowlist validation for landlord booking-term edits (pre-signing).
 */

import {
  ALLOWED_LEASE_TERMS,
  isPeriodicLeaseLength,
  leaseEndDateFromMoveIn,
} from './leaseEndDate.js'
import {
  buildRentBondPatchSlice,
  parseBondOverrideFromRequest,
  parseWeeklyRentAud,
} from './rentAgreedOverride.js'
import { parseCoTenantFromBody, housematesCountFromOccupantCount } from './occupancyBooking.js'
import { coTenantEmailDistinctFromPrimary } from './coTenantSigning.js'
import { parseCoTenantFromBooking } from './occupancyLeaseContext.js'

export const BOOKING_TERMS_PATCH_KEYS = new Set([
  'weekly_rent',
  'bondOverride',
  'lease_length',
  'move_in_date',
  'start_date',
  'occupant_count',
  'notes',
  'co_tenant',
])

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const NOTES_MAX_LEN = 4000

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function parseIsoDatePatch(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().slice(0, 10)
  if (!ISO_DATE_RE.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return s
}

/**
 * @param {unknown} current
 * @param {unknown} next
 */
function jsonEqual(current, next) {
  return JSON.stringify(current ?? null) === JSON.stringify(next ?? null)
}

/**
 * @param {Record<string, unknown>} changes
 * @param {string} field
 * @param {unknown} from
 * @param {unknown} to
 */
function recordChange(changes, field, from, to) {
  if (jsonEqual(from, to)) return
  changes[field] = { from: from ?? null, to: to ?? null }
}

/**
 * @param {{ co_tenant?: unknown } | null | undefined} booking
 * @param {{ full_name: string, email: string } | null | undefined} nextCoTenant
 * @returns {boolean}
 */
function coTenantIdentityChanged(booking, nextCoTenant) {
  if (!nextCoTenant) return false
  const prev = parseCoTenantFromBooking(booking?.co_tenant)
  if (!prev) return true
  return (
    prev.full_name.trim() !== nextCoTenant.full_name.trim() ||
    prev.email.trim().toLowerCase() !== nextCoTenant.email.trim().toLowerCase()
  )
}

/**
 * @param {object} merged
 * @returns {{ ok: true, coTenant: object | null } | { ok: false, message: string }}
 */
function validateOccupantCoTenantConsistency(merged) {
  const occ = Math.floor(Number(merged.occupant_count))
  const coTenant = parseCoTenantFromBooking(merged.co_tenant)
  const hasCo = coTenant != null
  const occGte2 = Number.isFinite(occ) && occ >= 2
  if (occGte2 !== hasCo) {
    return {
      ok: false,
      message: hasCo
        ? 'occupant_count must be at least 2 when a co-tenant is set.'
        : 'A valid co-tenant is required when occupant_count is 2 or more.',
    }
  }
  return { ok: true, coTenant }
}

/**
 * @param {object} currentBooking
 * @param {Record<string, unknown>} patch
 * @param {{ property: object, primaryTenantEmail?: string | null, landlordProfileId: string, reason: string }} context
 * @returns {Promise<{ patch: object, changes: object, errors: string[], co_tenant_unverified?: boolean }>}
 */
export async function buildBookingTermsPatch(currentBooking, patch, context) {
  const errors = []
  /** @type {Record<string, { from: unknown, to: unknown }>} */
  const changes = {}
  /** @type {Record<string, unknown>} */
  const out = {}

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { patch: {}, changes: {}, errors: ['invalid_patch'] }
  }

  const patchKeys = Object.keys(patch)
  if (patchKeys.length === 0) {
    return { patch: {}, changes: {}, errors: ['empty_patch'] }
  }

  for (const key of patchKeys) {
    if (!BOOKING_TERMS_PATCH_KEYS.has(key)) {
      errors.push(`unknown_field:${key}`)
    }
  }
  if (errors.length > 0) {
    return { patch: {}, changes: {}, errors }
  }

  /** @type {Record<string, unknown>} */
  const merged = { ...currentBooking }
  let coTenantUnverified = false
  let shouldRecomputeEndDate = false

  const hasWeeklyRent = Object.prototype.hasOwnProperty.call(patch, 'weekly_rent')
  const hasBondOverride = Object.prototype.hasOwnProperty.call(patch, 'bondOverride')

  if (hasWeeklyRent || hasBondOverride) {
    const agreedWeeklyRentAud = hasWeeklyRent
      ? parseWeeklyRentAud(patch.weekly_rent)
      : parseWeeklyRentAud(currentBooking.weekly_rent)

    if (agreedWeeklyRentAud == null) {
      errors.push('invalid_weekly_rent')
    } else {
      const bondOverride = hasBondOverride ? parseBondOverrideFromRequest(patch.bondOverride) : null
      if (hasBondOverride && patch.bondOverride != null && !bondOverride) {
        errors.push('invalid_bond_override')
      } else {
        const rentChanging =
          hasWeeklyRent && parseWeeklyRentAud(currentBooking.weekly_rent) !== agreedWeeklyRentAud
        const bondChanging = Boolean(bondOverride?.enabled)
        if (rentChanging || bondChanging) {
          const slice = await buildRentBondPatchSlice(
            currentBooking,
            context.property,
            agreedWeeklyRentAud,
            context.reason,
            context.landlordProfileId,
            bondOverride,
          )
          if (!slice.ok) {
            errors.push(slice.error)
            if (slice.message) errors.push(slice.message)
          } else {
            Object.assign(out, slice.patch)
            if (slice.patch.weekly_rent != null) {
              recordChange(changes, 'weekly_rent', currentBooking.weekly_rent, slice.patch.weekly_rent)
            }
            if (slice.patch.bond_amount != null) {
              recordChange(changes, 'bond_amount', currentBooking.bond_amount, slice.patch.bond_amount)
            }
            merged.weekly_rent = slice.patch.weekly_rent
            merged.bond_amount = slice.patch.bond_amount
            merged.rent_breakdown = slice.patch.rent_breakdown
          }
        }
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'lease_length')) {
    const ll = typeof patch.lease_length === 'string' ? patch.lease_length.trim() : ''
    if (!ALLOWED_LEASE_TERMS.includes(ll)) {
      errors.push('invalid_lease_length')
    } else {
      out.lease_length = ll
      merged.lease_length = ll
      recordChange(changes, 'lease_length', currentBooking.lease_length, ll)
      shouldRecomputeEndDate = true
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, 'move_in_date') ||
    Object.prototype.hasOwnProperty.call(patch, 'start_date')
  ) {
    const rawDate = Object.prototype.hasOwnProperty.call(patch, 'move_in_date')
      ? patch.move_in_date
      : patch.start_date
    const iso = parseIsoDatePatch(rawDate)
    if (!iso) {
      errors.push('invalid_move_in_date')
    } else {
      out.move_in_date = iso
      out.start_date = iso
      merged.move_in_date = iso
      merged.start_date = iso
      recordChange(changes, 'move_in_date', currentBooking.move_in_date, iso)
      recordChange(changes, 'start_date', currentBooking.start_date, iso)
      shouldRecomputeEndDate = true
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    const notes = typeof patch.notes === 'string' ? patch.notes.trim() : patch.notes === null ? '' : null
    if (notes === null) {
      errors.push('invalid_notes')
    } else if (notes.length > NOTES_MAX_LEN) {
      errors.push('notes_too_long')
    } else {
      const normalized = notes.length > 0 ? notes : null
      out.notes = normalized
      merged.notes = normalized
      recordChange(changes, 'notes', currentBooking.notes, normalized)
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'occupant_count')) {
    const occ = Math.floor(Number(patch.occupant_count))
    if (!Number.isFinite(occ) || occ < 1 || occ > 10) {
      errors.push('invalid_occupant_count')
    } else {
      out.occupant_count = occ
      out.housemates_count = housematesCountFromOccupantCount(occ)
      merged.occupant_count = occ
      merged.housemates_count = out.housemates_count
      recordChange(changes, 'occupant_count', currentBooking.occupant_count, occ)
      recordChange(changes, 'housemates_count', currentBooking.housemates_count, out.housemates_count)
      if (occ === 1) {
        out.co_tenant = null
        merged.co_tenant = null
        recordChange(changes, 'co_tenant', currentBooking.co_tenant, null)
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'co_tenant')) {
    if (patch.co_tenant === null) {
      out.co_tenant = null
      out.occupant_count = 1
      out.housemates_count = 0
      merged.co_tenant = null
      merged.occupant_count = 1
      merged.housemates_count = 0
      recordChange(changes, 'co_tenant', currentBooking.co_tenant, null)
      recordChange(changes, 'occupant_count', currentBooking.occupant_count, 1)
      recordChange(changes, 'housemates_count', currentBooking.housemates_count, 0)
    } else {
      const parsed = parseCoTenantFromBody(patch.co_tenant)
      if (!parsed.ok) {
        errors.push(typeof parsed.body?.error === 'string' ? parsed.body.error : 'invalid_co_tenant')
      } else if (
        !coTenantEmailDistinctFromPrimary(context.primaryTenantEmail, parsed.coTenant.email)
      ) {
        errors.push('co_tenant_email_must_differ')
      } else {
        const nextOcc = Math.max(Math.floor(Number(merged.occupant_count)) || 1, 2)
        out.co_tenant = parsed.coTenant
        out.occupant_count = nextOcc
        out.housemates_count = housematesCountFromOccupantCount(nextOcc)
        merged.co_tenant = parsed.coTenant
        merged.occupant_count = nextOcc
        merged.housemates_count = out.housemates_count
        recordChange(changes, 'co_tenant', currentBooking.co_tenant, parsed.coTenant)
        if (nextOcc !== Math.floor(Number(currentBooking.occupant_count))) {
          recordChange(changes, 'occupant_count', currentBooking.occupant_count, nextOcc)
        }
        if (out.housemates_count !== currentBooking.housemates_count) {
          recordChange(changes, 'housemates_count', currentBooking.housemates_count, out.housemates_count)
        }
        if (coTenantIdentityChanged(currentBooking, parsed.coTenant)) {
          coTenantUnverified = true
        }
      }
    }
  }

  if (errors.length > 0) {
    return { patch: {}, changes: {}, errors }
  }

  if (shouldRecomputeEndDate) {
    const moveIn = String(merged.move_in_date || merged.start_date || '').slice(0, 10)
    const leaseLen = typeof merged.lease_length === 'string' ? merged.lease_length : null
    let newEnd = null
    if (moveIn && ISO_DATE_RE.test(moveIn)) {
      newEnd = isPeriodicLeaseLength(leaseLen) ? null : leaseEndDateFromMoveIn(moveIn, leaseLen)
    }
    out.end_date = newEnd
    merged.end_date = newEnd
    recordChange(changes, 'end_date', currentBooking.end_date, newEnd)
  }

  const consistency = validateOccupantCoTenantConsistency(merged)
  if (!consistency.ok) {
    return { patch: {}, changes: {}, errors: ['occupant_co_tenant_inconsistent'] }
  }

  if (Object.keys(changes).length === 0) {
    return { patch: {}, changes: {}, errors: ['no_changes'] }
  }

  return {
    patch: out,
    changes,
    errors: [],
    ...(coTenantUnverified ? { co_tenant_unverified: true } : {}),
  }
}
