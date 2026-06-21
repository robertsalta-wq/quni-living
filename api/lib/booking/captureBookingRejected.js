import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'
import { insertJourneyEvent } from '../journey/insertJourneyEvent.js'

/**
 * @typedef {Object} BookingRejectVisibility
 * @property {string} [error_code]
 * @property {number} [http_status]
 * @property {string | null} [property_id]
 * @property {string | null} [user_id]
 * @property {string | null} [student_profile_id]
 * @property {string | null} [service_tier]
 * @property {string | null} [mode]
 * @property {string | null} [email]
 * @property {string | null} [attempt_id]
 * @property {string | null} [verification_type]
 * @property {string | null} [accommodation_verification_route]
 * @property {boolean | null} [open_to_non_students]
 */

const JOURNEY_METADATA_KEYS = new Set([
  'student_profile_id',
  'verification_type',
  'accommodation_verification_route',
  'open_to_non_students',
  'paymentIntentId',
  'cleanup_context',
  'supabaseMessage',
  'piStatusAfter',
  'booking_id',
])

/**
 * @param {BookingRejectVisibility & Record<string, unknown>} ctx
 */
function journeyMetadataFromContext(ctx) {
  /** @type {Record<string, unknown>} */
  const metadata = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (value == null) continue
    if (JOURNEY_METADATA_KEYS.has(key)) metadata[key] = value
  }
  return metadata
}

/**
 * Best-effort Sentry event for handled booking rejections (Phase 0 visibility).
 * Eligibility 403s → warning; race/conflict 409s → error.
 * Also appends booking_rejected to journey_events (Phase 1).
 *
 * @param {BookingRejectVisibility & Record<string, unknown>} ctx
 */
export async function captureBookingRejected(ctx) {
  const error_code = typeof ctx.error_code === 'string' ? ctx.error_code : 'unknown'
  const http_status = typeof ctx.http_status === 'number' ? ctx.http_status : 403
  const level = http_status === 409 || http_status >= 500 ? 'error' : 'warning'

  const extra = {
    error_code,
    http_status,
    property_id: ctx.property_id ?? null,
    user_id: ctx.user_id ?? null,
    student_profile_id: ctx.student_profile_id ?? null,
    service_tier: ctx.service_tier ?? null,
    mode: ctx.mode ?? null,
    email: ctx.email ?? null,
    attempt_id: ctx.attempt_id ?? null,
  }

  for (const [key, value] of Object.entries(ctx)) {
    if (key in extra || value == null) continue
    extra[key] = value
  }

  await Promise.all([
    captureSentryMessageEdge('booking_rejected', extra, {
      level,
      tags: {
        error_code,
        ...(ctx.mode ? { booking_mode: String(ctx.mode) } : {}),
      },
    }),
    insertJourneyEvent({
      user_id: ctx.user_id ?? null,
      email: ctx.email ?? null,
      attempt_id: ctx.attempt_id ?? null,
      property_id: ctx.property_id ?? null,
      event_type: 'booking_rejected',
      step: typeof ctx.mode === 'string' ? ctx.mode : null,
      error_code,
      http_status,
      service_tier: ctx.service_tier ?? null,
      metadata: journeyMetadataFromContext(ctx),
    }),
  ])
}

/**
 * @param {import('@supabase/supabase-js').User | { id?: string; email?: string | null } | null | undefined} user
 * @param {string | null | undefined} propertyId
 * @param {'preview' | 'listing_commit' | 'managed_commit' | 'booking_email' | 'stripe_payment_setup' | string | null} mode
 * @param {Record<string, unknown>} [extras]
 * @returns {BookingRejectVisibility}
 */
export function buildBookingRejectVisibility(user, propertyId, mode, extras = {}) {
  return {
    user_id: user?.id ?? null,
    email: typeof user?.email === 'string' ? user.email : null,
    property_id: typeof propertyId === 'string' ? propertyId.trim() || null : null,
    mode: mode ?? null,
    ...extras,
  }
}

/**
 * Parse error code from a handled JSON Response, capture, and return the same Response.
 *
 * @param {Response | null | undefined} res
 * @param {BookingRejectVisibility & Record<string, unknown>} visibility
 * @param {string} fallbackErrorCode
 * @returns {Promise<Response | null | undefined>}
 */
export async function captureBookingRejectedResponse(res, visibility, fallbackErrorCode) {
  if (!res) return res
  let error_code = fallbackErrorCode
  try {
    const body = await res.clone().json()
    if (body && typeof body.error === 'string' && body.error.trim()) {
      error_code = body.error.trim()
    }
  } catch {
    /* ignore non-JSON */
  }
  await captureBookingRejected({
    ...visibility,
    error_code,
    http_status: res.status,
  })
  return res
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   user_id?: string | null
 *   email?: string | null
 *   attempt_id?: string | null
 *   property_id?: string | null
 *   event_type: string
 *   step?: string | null
 *   service_tier?: string | null
 *   metadata?: Record<string, unknown>
 * }} row
 */
export function recordJourneyEvent(admin, row) {
  void insertJourneyEvent(row, admin)
}
