/**
 * Landlord agreed-rent override on pending bookings (pre-accept).
 */

import {
  assertBondWithinCap,
  parseBondWeeks,
  parsePropertyBondAud,
  recomputeBondForAgreedRent,
  resolveAcceptanceBondOverrideAud,
} from './bookingBondAmount.js'

export const RENT_OVERRIDE_ALLOWED_STATUSES = new Set(['pending_confirmation', 'awaiting_info'])

export const RENT_AGREED_OVERRIDE_EVENT = 'rent_agreed_override'

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseWeeklyRentAud(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

/**
 * Apply-time weekly rent for cap / bond ratio (before or after overrides).
 * @param {unknown} rentBreakdown
 * @param {unknown} currentWeeklyRent
 */
export function applyWeeklyRentFromBooking(rentBreakdown, currentWeeklyRent) {
  if (rentBreakdown && typeof rentBreakdown === 'object' && !Array.isArray(rentBreakdown)) {
    const o = rentBreakdown
    const snap = parseWeeklyRentAud(o.apply_weekly_rent)
    if (snap != null) return snap
  }
  return parseWeeklyRentAud(currentWeeklyRent)
}

/**
 * Listing-derived breakdown without override provenance fields.
 * @param {unknown} rentBreakdown
 */
export function baseRentBreakdownFromBooking(rentBreakdown) {
  if (!rentBreakdown || typeof rentBreakdown !== 'object' || Array.isArray(rentBreakdown)) {
    return { base: 0 }
  }
  const o = rentBreakdown
  const base = parseWeeklyRentAud(o.base) ?? 0
  /** @type {Record<string, number>} */
  const out = { base }
  const couple = parseWeeklyRentAud(o.couple)
  if (couple != null && couple > 0) out.couple = couple
  const parking = parseWeeklyRentAud(o.parking)
  if (parking != null && parking > 0) out.parking = parking
  return out
}

/**
 * @param {Record<string, number>} baseBreakdown
 * @param {number} applyWeeklyRentAud
 * @param {number} agreedWeeklyRentAud
 */
export function rentBreakdownWithOverride(baseBreakdown, applyWeeklyRentAud, agreedWeeklyRentAud) {
  return {
    ...baseBreakdown,
    override_applied: true,
    apply_weekly_rent: applyWeeklyRentAud,
    agreed_weekly_rent: agreedWeeklyRentAud,
  }
}

/**
 * @param {unknown} raw
 * @returns {{ enabled: boolean; weeks: number | null } | null}
 */
export function parseBondOverrideFromRequest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw
  if (!o.enabled) return null
  if (o.weeks != null && o.weeks !== '') {
    const weeks = parseBondWeeks(o.weeks)
    if (weeks == null) return null
    return { enabled: true, weeks }
  }
  return null
}

/**
 * @param {object} booking
 * @param {object} property
 * @param {number} agreedWeeklyRentAud
 * @param {string} reason
 * @param {string} landlordProfileId
 * @param {{ enabled: boolean; weeks: number | null } | null} [bondOverride]
 * @returns {Promise<{ ok: true, patch: object; eventMetadata: object } | { ok: false; status: number; error: string; message?: string }>}
 */
export async function buildRentAgreedOverridePatch(
  booking,
  property,
  agreedWeeklyRentAud,
  reason,
  landlordProfileId,
  bondOverride = null,
) {
  const status = typeof booking.status === 'string' ? booking.status : ''
  if (!RENT_OVERRIDE_ALLOWED_STATUSES.has(status)) {
    return {
      ok: false,
      status: 409,
      error: 'invalid_booking_status',
      message: 'Agreed rent can only be changed before you accept this booking.',
    }
  }

  if (booking.service_tier_at_request === 'managed') {
    return {
      ok: false,
      status: 400,
      error: 'managed_booking',
      message: 'Agreed rent override is not available for managed bookings yet.',
    }
  }

  const pi =
    typeof booking.stripe_payment_intent_id === 'string' ? booking.stripe_payment_intent_id.trim() : ''
  if (pi && booking.service_tier_at_request !== 'listing') {
    return {
      ok: false,
      status: 400,
      error: 'deposit_captured',
      message: 'Agreed rent cannot be changed after a deposit authorization exists.',
    }
  }

  const applyWeeklyRent = applyWeeklyRentFromBooking(booking.rent_breakdown, booking.weekly_rent)
  if (applyWeeklyRent == null) {
    return { ok: false, status: 400, error: 'invalid_apply_rent', message: 'Booking is missing apply-time rent.' }
  }

  if (agreedWeeklyRentAud > applyWeeklyRent) {
    return {
      ok: false,
      status: 400,
      error: 'rent_exceeds_apply_cap',
      message: 'Agreed rent cannot exceed the weekly rent the student applied at.',
    }
  }

  const currentWeekly = parseWeeklyRentAud(booking.weekly_rent)
  const rentUnchanged = currentWeekly != null && agreedWeeklyRentAud === currentWeekly
  if (rentUnchanged && !bondOverride?.enabled) {
    return { ok: false, status: 400, error: 'unchanged', message: 'Agreed rent is unchanged.' }
  }

  let newBondAmount
  /** @type {Record<string, unknown>} */
  const bondBreakdownFields = {}

  if (bondOverride?.enabled) {
    newBondAmount = resolveAcceptanceBondOverrideAud({ weeks: bondOverride.weeks }, agreedWeeklyRentAud)
    if (bondOverride.weeks != null) {
      bondBreakdownFields.acceptance_bond_weeks = bondOverride.weeks
    }
  } else {
    try {
      newBondAmount = recomputeBondForAgreedRent(
        property,
        booking.bond_amount,
        applyWeeklyRent,
        agreedWeeklyRentAud,
        booking.rent_breakdown,
      )
    } catch {
      return { ok: false, status: 400, error: 'bond_recompute_failed', message: 'Could not recompute bond for agreed rent.' }
    }
  }

  const capCheck = assertBondWithinCap(newBondAmount, agreedWeeklyRentAud)
  if (!capCheck.ok) {
    return {
      ok: false,
      status: 400,
      error: 'bond_exceeds_statutory_cap',
      message: capCheck.message,
    }
  }

  const baseBreakdown = baseRentBreakdownFromBooking(booking.rent_breakdown)
  const rent_breakdown = {
    ...rentBreakdownWithOverride(baseBreakdown, applyWeeklyRent, agreedWeeklyRentAud),
    ...bondBreakdownFields,
  }

  const fromWeekly = currentWeekly ?? applyWeeklyRent

  return {
    ok: true,
    patch: {
      weekly_rent: agreedWeeklyRentAud,
      rent_breakdown,
      bond_amount: newBondAmount,
    },
    eventMetadata: {
      from_weekly_rent_aud: fromWeekly,
      to_weekly_rent_aud: agreedWeeklyRentAud,
      from_bond_amount_aud: parsePropertyBondAud(booking.bond_amount),
      to_bond_amount_aud: newBondAmount,
      apply_weekly_rent_aud: applyWeeklyRent,
      reason: reason.trim(),
      actor_landlord_id: landlordProfileId,
      ...(bondOverride?.enabled
        ? {
            bond_override_weeks: bondOverride.weeks,
          }
        : {}),
    },
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {object} args
 */
export async function insertRentAgreedOverrideEvent(admin, args) {
  const { booking, property, landlordProfileId, studentId, metadata } = args
  const { error } = await admin.from('service_tier_events').insert({
    booking_id: booking.id,
    property_id: booking.property_id ?? property?.id ?? null,
    landlord_id: landlordProfileId,
    student_id: studentId ?? booking.student_id ?? null,
    event_type: RENT_AGREED_OVERRIDE_EVENT,
    service_tier: booking.service_tier_at_request === 'managed' ? 'managed' : 'listing',
    metadata: {
      ...metadata,
      recorded_at: new Date().toISOString(),
    },
  })
  if (error) throw error
}
