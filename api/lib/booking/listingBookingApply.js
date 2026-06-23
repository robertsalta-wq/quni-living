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
  }
}
