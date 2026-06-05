/**
 * Parse and validate occupancy pricing fields on booking PI create / commit.
 */
import { ResolveWeeklyRentError, resolveWeeklyRent } from '../pricing/resolveWeeklyRent.js'

export const OCCUPANCY_PROPERTY_COLUMNS =
  'rent_per_week, max_occupants, couple_surcharge_per_week, parking_surcharge_per_week, parking_available'

/** RTA `housemates_count` = occupants beyond tenant (1) - stored on booking at commit. */
export function housematesCountFromOccupantCount(occupantCount) {
  const n = Math.floor(Number(occupantCount))
  if (!Number.isFinite(n) || n < 1) return 0
  return Math.max(0, Math.min(10, n) - 1)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * @param {unknown} body
 * @returns {{ ok: true, occupantCount: number, parkingSelected: boolean } | { ok: false, status: number, body: Record<string, unknown> }}
 */
export function parseOccupancyScalarsFromBody(body) {
  const rawCount = body?.occupantCount ?? body?.occupant_count ?? 1
  const occupantCount = Math.floor(Number(rawCount))
  if (!Number.isFinite(occupantCount) || occupantCount < 1 || occupantCount > 10) {
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid_occupant_count', message: 'occupantCount must be between 1 and 10' },
    }
  }

  const parkingSelected = body?.parkingSelected === true || body?.parking_selected === true

  return { ok: true, occupantCount, parkingSelected }
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, coTenant: { full_name: string, email: string, phone: string, date_of_birth: string } } | { ok: false, status: number, body: Record<string, unknown> }}
 */
export function parseCoTenantFromBody(raw) {
  if (raw == null) {
    return { ok: false, status: 400, body: { error: 'co_tenant_required', message: 'coTenant is required when occupantCount is 2' } }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, status: 400, body: { error: 'invalid_co_tenant', message: 'coTenant must be an object' } }
  }

  const full_name = typeof raw.full_name === 'string' ? raw.full_name.trim() : ''
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : ''
  const date_of_birth =
    typeof raw.date_of_birth === 'string' ? raw.date_of_birth.trim().slice(0, 10) : ''

  if (full_name.length < 2) {
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid_co_tenant', message: 'coTenant.full_name is required' },
    }
  }
  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid_co_tenant', message: 'coTenant.email must be a valid email address' },
    }
  }
  if (phone.length < 6) {
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid_co_tenant', message: 'coTenant.phone is required' },
    }
  }
  if (!ISO_DATE_RE.test(date_of_birth)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'invalid_co_tenant',
        message: 'coTenant.date_of_birth must be YYYY-MM-DD',
      },
    }
  }

  return {
    ok: true,
    coTenant: { full_name, email, phone, date_of_birth },
  }
}

/**
 * @param {number} occupantCount
 * @param {unknown} coTenantRaw
 * @param {{ primaryTenantEmail?: string | null }} [opts]
 * @returns {{ ok: true, coTenant: object | null } | { ok: false, status: number, body: Record<string, unknown> }}
 */
export function resolveCoTenantForCommit(occupantCount, coTenantRaw, opts = {}) {
  if (occupantCount === 1) {
    if (coTenantRaw != null) {
      return {
        ok: false,
        status: 400,
        body: {
          error: 'co_tenant_not_allowed',
          message: 'coTenant must not be sent when occupantCount is 1',
        },
      }
    }
    return { ok: true, coTenant: null }
  }

  const parsed = parseCoTenantFromBody(coTenantRaw)
  if (!parsed.ok) return parsed

  const primaryEmail =
    typeof opts.primaryTenantEmail === 'string' ? opts.primaryTenantEmail.trim().toLowerCase() : ''
  const coEmail = parsed.coTenant.email.trim().toLowerCase()
  if (primaryEmail && coEmail === primaryEmail) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'co_tenant_email_must_differ',
        message:
          'Co-tenant must use a different email from your account so they can sign the lease separately.',
      },
    }
  }

  return { ok: true, coTenant: parsed.coTenant }
}

/**
 * @param {import('../pricing/resolveWeeklyRent.js').OccupancyPricingProperty} property
 * @param {{ occupantCount: number, parkingSelected: boolean }} input
 */
export function resolveWeeklyRentForBooking(property, input) {
  try {
    return { ok: true, resolved: resolveWeeklyRent(property, input) }
  } catch (e) {
    if (e instanceof ResolveWeeklyRentError) {
      return {
        ok: false,
        status: 400,
        body: {
          error: rentErrorCodeToApi(e.code),
          message: e.message,
        },
      }
    }
    throw e
  }
}

/** @param {import('../pricing/resolveWeeklyRent.js').ResolveWeeklyRentErrorCode} code */
function rentErrorCodeToApi(code) {
  switch (code) {
    case 'OCCUPANTS_EXCEED_MAX':
      return 'occupants_exceed_max'
    case 'PARKING_NOT_AVAILABLE':
      return 'parking_not_available'
    case 'INVALID_BASE_RENT':
      return 'invalid_base_rent'
    case 'INVALID_OCCUPANT_COUNT':
      return 'invalid_occupant_count'
    default:
      return 'invalid_rent'
  }
}

/**
 * @param {Record<string, string | undefined>} meta
 */
export function occupancyFromPaymentIntentMetadata(meta) {
  const occupantCount = Math.floor(Number(meta.occupantCount ?? '1'))
  const parkingSelected = meta.parkingSelected === 'true'
  const weeklyRentCents = Math.floor(Number(meta.weeklyRentCents ?? meta.depositCents ?? ''))
  const depositCents = Math.floor(Number(meta.depositCents ?? ''))
  return {
    occupantCount: Number.isFinite(occupantCount) && occupantCount >= 1 ? occupantCount : 1,
    parkingSelected,
    weeklyRentCents: Number.isFinite(weeklyRentCents) ? weeklyRentCents : null,
    depositCents: Number.isFinite(depositCents) ? depositCents : null,
  }
}

/**
 * @param {Record<string, string | undefined>} meta
 * @param {{ occupantCount: number, parkingSelected: boolean, weeklyRentCents: number, depositCents: number }} expected
 */
export function assertPiMetadataMatchesOccupancy(meta, expected) {
  const fromPi = occupancyFromPaymentIntentMetadata(meta)
  if (fromPi.occupantCount !== expected.occupantCount) {
    return {
      ok: false,
      body: {
        error: 'payment_occupancy_mismatch',
        message: 'Payment was authorised for a different number of occupants',
      },
    }
  }
  if (fromPi.parkingSelected !== expected.parkingSelected) {
    return {
      ok: false,
      body: {
        error: 'payment_occupancy_mismatch',
        message: 'Payment was authorised with different parking selection',
      },
    }
  }
  if (fromPi.weeklyRentCents != null && fromPi.weeklyRentCents !== expected.weeklyRentCents) {
    return {
      ok: false,
      body: {
        error: 'payment_rent_mismatch',
        message: 'Payment deposit does not match resolved weekly rent',
      },
    }
  }
  if (fromPi.depositCents != null && fromPi.depositCents !== expected.depositCents) {
    return {
      ok: false,
      body: {
        error: 'payment_rent_mismatch',
        message: 'Payment deposit does not match resolved weekly rent',
      },
    }
  }
  return { ok: true }
}
