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

/**
 * Statuses that block new applications on a property (distinct from tenant "confirmed stay").
 * Includes Listing `bond_pending` so the property is reserved after landlord accept until
 * bond is received, expired, or cancelled — then the guard re-reads status and reopens.
 */
export const PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES = [
  'confirmed',
  'active',
  'bond_pending',
]
