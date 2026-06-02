/**
 * Booking statuses that reserve a tenant's date range for cross-property overlap checks.
 * Keep in sync with product rules: one active stay pipeline at a time.
 */
export const TENANT_BOOKING_PIPELINE_STATUSES = [
  'pending_confirmation',
  'awaiting_info',
  'bond_pending',
  'confirmed',
  'active',
]

/** Property is taken for new bookings once a stay is fully confirmed on-platform. */
export const TENANT_BOOKING_CONFIRMED_STATUSES = ['confirmed', 'active']
