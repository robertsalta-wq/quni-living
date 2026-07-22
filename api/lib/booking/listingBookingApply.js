/**
 * Listing-tier student apply: booking request only — no student Stripe PI, deposit, or rent collection.
 */

import { bondAmountAtApplyFromProperty } from './bookingBondAmount.js'

/**
 * @param {string | null | undefined} serviceTier
 */
export function isListingServiceTier(serviceTier) {
  return serviceTier === 'listing'
}

/**
 * Listing bookings never carry a student deposit authorization after apply (legacy rows may still have a PI until accept cancels it).
 * @param {{ stripe_payment_intent_id?: string | null, service_tier_at_request?: string | null }} booking
 */
export function bookingHasStudentDepositAuthorization(booking) {
  const tier = booking?.service_tier_at_request
  if (tier === 'listing') return false
  const id =
    typeof booking?.stripe_payment_intent_id === 'string' ? booking.stripe_payment_intent_id.trim() : ''
  return Boolean(id)
}

/**
 * @param {{ service_tier_at_request?: string | null, stripe_payment_intent_id?: string | null }} booking
 */
export function isListingBookingApplyRow(booking) {
  if (booking?.service_tier_at_request === 'listing') return true
  if (booking?.service_tier_at_request === 'managed') return false
  return !bookingHasStudentDepositAuthorization(booking)
}

/** Extra property columns for listing_snapshot (suburb + rent_per_week already on occupancy select). */
export const LISTING_SNAPSHOT_PROPERTY_COLUMNS =
  'description, house_rules, images, room_type, furnished'

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (value !== null && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(/** @type {Record<string, unknown>} */ (value)[key])
    }
    return out
  }
  return value
}

/**
 * SHA-256 hex of UTF-8 JSON with keys sorted recursively.
 * @param {Record<string, unknown>} snapshot
 * @returns {Promise<string>}
 */
export async function hashListingSnapshot(snapshot) {
  const canonical = JSON.stringify(sortKeysDeep(snapshot))
  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Load amenity names for a property (property_features → features.name).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} propertyId
 * @returns {Promise<string[]>}
 */
export async function loadAmenityNamesForProperty(admin, propertyId) {
  const { data, error } = await admin
    .from('property_features')
    .select('features ( name )')
    .eq('property_id', propertyId)

  if (error) {
    console.error('[listing-snapshot] property_features', error)
    throw new Error('Could not load property amenities for listing snapshot')
  }

  const names = []
  for (const row of data ?? []) {
    const feat = row?.features
    const name =
      feat && typeof feat === 'object' && !Array.isArray(feat) && typeof feat.name === 'string'
        ? feat.name.trim()
        : Array.isArray(feat) && feat[0] && typeof feat[0].name === 'string'
          ? feat[0].name.trim()
          : ''
    if (name) names.push(name)
  }
  names.sort((a, b) => a.localeCompare(b))
  return names
}

/**
 * Compose listing_snapshot from a loaded property row + amenity names.
 * @param {Record<string, unknown>} property
 * @param {string[]} amenityNames
 * @returns {Record<string, unknown>}
 */
export function composeListingSnapshot(property, amenityNames) {
  const imagesRaw = property.images
  const photoUrls = Array.isArray(imagesRaw)
    ? imagesRaw.filter((u) => typeof u === 'string' && u.trim()).map((u) => String(u).trim())
    : []

  return {
    description: typeof property.description === 'string' ? property.description : null,
    house_rules: typeof property.house_rules === 'string' ? property.house_rules : null,
    amenity_names: amenityNames,
    photo_urls: photoUrls,
    room_type: typeof property.room_type === 'string' ? property.room_type : null,
    suburb: typeof property.suburb === 'string' ? property.suburb : null,
    furnished: typeof property.furnished === 'boolean' ? property.furnished : null,
    weekly_rent:
      typeof property.rent_per_week === 'number' && Number.isFinite(property.rent_per_week)
        ? property.rent_per_week
        : null,
  }
}

/**
 * Server-side snapshot + hash at booking insert. Do not trust client JSON.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {Record<string, unknown>} property
 * @returns {Promise<{ listing_acknowledged: true, listing_acknowledged_at: string, listing_snapshot: Record<string, unknown>, listing_snapshot_hash: string }>}
 */
export async function buildListingAcknowledgmentColumns(admin, property) {
  const propertyId = typeof property.id === 'string' ? property.id : ''
  if (!propertyId) {
    throw new Error('Property id required for listing acknowledgment snapshot')
  }
  const amenityNames = await loadAmenityNamesForProperty(admin, propertyId)
  const listing_snapshot = composeListingSnapshot(property, amenityNames)
  const listing_snapshot_hash = await hashListingSnapshot(listing_snapshot)
  return {
    listing_acknowledged: true,
    listing_acknowledged_at: new Date().toISOString(),
    listing_snapshot,
    listing_snapshot_hash,
  }
}

/**
 * Build the bookings insert row for a Listing apply (no payment fields).
 * @param {object} args
 */
export function buildListingApplyBookingRow({
  property,
  student,
  moveInDate,
  leaseLength,
  studentMessage,
  propertyType,
  occupantCount,
  parkingSelected,
  weeklyRent,
  breakdownAud,
  coTenant,
  serviceTierAtRequest,
  expiresAt,
  endDate,
  tenantInviteId = null,
  bondAmount: bondAmountOverride = null,
  listingAcknowledgment = null,
}) {
  const bondAmount =
    bondAmountOverride != null
      ? bondAmountOverride
      : bondAmountAtApplyFromProperty(property, weeklyRent)
  return {
    property_id: property.id,
    student_id: student.id,
    landlord_id: property.landlord_id,
    start_date: moveInDate,
    move_in_date: moveInDate,
    end_date: endDate,
    weekly_rent: weeklyRent,
    ...(bondAmount != null ? { bond_amount: bondAmount } : {}),
    status: 'pending_confirmation',
    notes: null,
    student_message: studentMessage?.trim() || null,
    lease_length: leaseLength,
    bond_acknowledged: true,
    property_type: propertyType,
    expires_at: expiresAt,
    occupant_count: occupantCount,
    parking_selected: parkingSelected,
    rent_breakdown: breakdownAud,
    co_tenant: coTenant,
    housemates_count: occupantCount >= 2 ? 1 : 0,
    booking_fee_paid: false,
    ...(serviceTierAtRequest ? { service_tier_at_request: serviceTierAtRequest } : {}),
    ...(tenantInviteId ? { tenant_invite_id: tenantInviteId } : {}),
    ...(listingAcknowledgment
      ? {
          listing_acknowledged: listingAcknowledgment.listing_acknowledged,
          listing_acknowledged_at: listingAcknowledgment.listing_acknowledged_at,
          listing_snapshot: listingAcknowledgment.listing_snapshot,
          listing_snapshot_hash: listingAcknowledgment.listing_snapshot_hash,
        }
      : {}),
  }
}
