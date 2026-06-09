import { PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES } from './tenantBookingPipelineStatuses.js'

/**
 * Returns whether a new application should be blocked because the property is reserved.
 * Used by Listing and Managed apply commit paths in create-booking-payment-intent.js.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} propertyId
 * @returns {Promise<
 *   | { ok: true }
 *   | { ok: false; status: number; body: { error: string; message?: string } }
 * >}
 */
export async function checkPropertyAvailableForNewApplication(admin, propertyId) {
  const id = typeof propertyId === 'string' ? propertyId.trim() : ''
  if (!id) {
    return { ok: false, status: 400, body: { error: 'propertyId is required' } }
  }

  const { data: rows, error } = await admin
    .from('bookings')
    .select('id, status')
    .eq('property_id', id)
    .in('status', PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES)
    .limit(1)

  if (error) {
    console.error('checkPropertyAvailableForNewApplication', error)
    return { ok: false, status: 500, body: { error: 'Server error' } }
  }

  if (rows?.length) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'property_unavailable',
        message: 'This property is no longer available.',
      },
    }
  }

  return { ok: true }
}
