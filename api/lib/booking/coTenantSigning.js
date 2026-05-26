/**
 * Co-tenant DocuSeal signer — load from booking and validate distinct email from primary tenant.
 */
import { parseCoTenantFromBooking } from './occupancyLeaseContext.js'

/**
 * @param {string | null | undefined} primaryEmail
 * @param {string | null | undefined} coEmail
 * @returns {boolean}
 */
export function coTenantEmailDistinctFromPrimary(primaryEmail, coEmail) {
  const a = typeof primaryEmail === 'string' ? primaryEmail.trim().toLowerCase() : ''
  const b = typeof coEmail === 'string' ? coEmail.trim().toLowerCase() : ''
  if (!a || !b) return true
  return a !== b
}

/**
 * @param {{ occupant_count?: unknown, co_tenant?: unknown } | null | undefined} booking
 * @returns {boolean}
 */
export function bookingRequiresCoTenantSignature(booking) {
  const occ = Math.floor(Number(booking?.occupant_count))
  if (!Number.isFinite(occ) || occ < 2) return false
  return parseCoTenantFromBooking(booking?.co_tenant) != null
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} tenancyId
 * @returns {Promise<{ name: string, email: string } | null>}
 */
export async function fetchCoTenantSignerForTenancy(admin, tenancyId) {
  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('booking_id')
    .eq('id', tenancyId)
    .maybeSingle()

  if (tErr || !tenancy?.booking_id) return null

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('occupant_count, co_tenant')
    .eq('id', tenancy.booking_id)
    .maybeSingle()

  if (bErr || !booking || !bookingRequiresCoTenantSignature(booking)) return null

  const ct = parseCoTenantFromBooking(booking.co_tenant)
  if (!ct?.email) return null
  return { name: ct.full_name, email: ct.email }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @returns {Promise<{ name: string, email: string } | null>}
 */
export async function fetchCoTenantSignerForBooking(admin, bookingId) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select('occupant_count, co_tenant')
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !booking || !bookingRequiresCoTenantSignature(booking)) return null
  const ct = parseCoTenantFromBooking(booking.co_tenant)
  if (!ct?.email) return null
  return { name: ct.full_name, email: ct.email }
}
