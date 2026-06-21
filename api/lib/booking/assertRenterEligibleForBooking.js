/**
 * Hard gate: renters must meet verification_type requirements before booking-side effects.
 * Reads live student_profiles.verification_type (not JWT role).
 */

import { captureBookingRejected } from './captureBookingRejected.js'

/**
 * @param {'student' | 'identity' | 'none' | null | undefined} verificationType
 * @param {boolean | null | undefined} openToNonStudents
 * @param {(body: object, status: number, origin: string) => Response} json
 * @param {string} origin
 * @param {Record<string, unknown>} [visibilityContext]
 * @returns {Response | null}
 */
export function renterBookingEligibilityBlock(
  verificationType,
  openToNonStudents,
  json,
  origin,
  visibilityContext,
) {
  const vt =
    verificationType === 'student' || verificationType === 'identity' ? verificationType : 'none'

  if (vt === 'none') {
    void captureBookingRejected({
      ...(visibilityContext ?? {}),
      error_code: 'verification_required',
      http_status: 403,
    })
    return json(
      {
        error: 'verification_required',
        message: 'Complete verification before submitting a booking request.',
      },
      403,
      origin,
    )
  }

  if (openToNonStudents === false && vt === 'identity') {
    void captureBookingRejected({
      ...(visibilityContext ?? {}),
      error_code: 'student_only_listing',
      http_status: 403,
    })
    return json(
      {
        error: 'student_only_listing',
        message: 'This listing is for verified students only.',
      },
      403,
      origin,
    )
  }

  return null
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId Supabase auth user id
 * @param {string} propertyId
 * @param {(body: object, status: number, origin: string) => Response} json
 * @param {string} origin
 * @param {Record<string, unknown>} [visibilityContext]
 * @returns {Promise<Response | null>}
 */
export async function assertRenterEligibleForBooking(
  admin,
  userId,
  propertyId,
  json,
  origin,
  visibilityContext,
) {
  const uid = typeof userId === 'string' ? userId.trim() : ''
  const pid = typeof propertyId === 'string' ? propertyId.trim() : ''
  if (!uid || !pid) {
    return json({ error: 'Server error' }, 500, origin)
  }

  const [{ data: profile, error: profileErr }, { data: property, error: propertyErr }] =
    await Promise.all([
      admin
        .from('student_profiles')
        .select('id, verification_type, accommodation_verification_route')
        .eq('user_id', uid)
        .maybeSingle(),
      admin.from('properties').select('open_to_non_students, service_tier').eq('id', pid).maybeSingle(),
    ])

  if (profileErr || propertyErr) {
    console.error('assertRenterEligibleForBooking', profileErr || propertyErr)
    return json({ error: 'Server error' }, 500, origin)
  }

  if (!profile) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  if (!property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  const ctx = {
    ...(visibilityContext ?? {}),
    user_id: uid,
    property_id: pid,
    student_profile_id: profile.id ?? null,
    service_tier: property.service_tier ?? visibilityContext?.service_tier ?? null,
    verification_type: profile.verification_type ?? null,
    accommodation_verification_route: profile.accommodation_verification_route ?? null,
    open_to_non_students: property.open_to_non_students ?? null,
  }

  return renterBookingEligibilityBlock(
    profile.verification_type,
    property.open_to_non_students,
    json,
    origin,
    ctx,
  )
}
