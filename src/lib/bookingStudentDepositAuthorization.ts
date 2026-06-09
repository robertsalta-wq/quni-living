/** Mirrors api/lib/booking/listingBookingApply.js for landlord/student UI gates. */
export function bookingHasStudentDepositAuthorization(booking: {
  stripe_payment_intent_id?: string | null
  service_tier_at_request?: string | null
}): boolean {
  if (booking.service_tier_at_request === 'listing') return false
  const id = booking.stripe_payment_intent_id?.trim() ?? ''
  return Boolean(id)
}
