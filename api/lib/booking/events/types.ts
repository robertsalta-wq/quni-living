/**
 * Canonical booking event types + defaults for audience/outcome.
 * Schema lives in booking_events; payloads are validated lightly at the helper.
 */

export const BOOKING_EVENT_AUDIENCES = ['internal', 'both'] as const
export type BookingEventAudience = (typeof BOOKING_EVENT_AUDIENCES)[number]

export const BOOKING_EVENT_OUTCOMES = ['success', 'failure', 'pending', 'n/a'] as const
export type BookingEventOutcome = (typeof BOOKING_EVENT_OUTCOMES)[number]

export const BOOKING_EVENT_ACTOR_TYPES = [
  'system',
  'student',
  'landlord',
  'admin',
  'webhook',
  'cron',
] as const
export type BookingEventActorType = (typeof BOOKING_EVENT_ACTOR_TYPES)[number]

export const BOOKING_EVENT_PROVIDERS = ['docuseal', 'resend', 'stripe'] as const
export type BookingEventProvider = (typeof BOOKING_EVENT_PROVIDERS)[number]

/** First-slice + known domain types. Extend here when emitting new events. */
export const BOOKING_EVENT_TYPES = [
  // Status spine (Stage 3)
  'booking.status_changed',
  'booking.field_changed',
  // Documents / DocuSeal (Stage 5)
  'document.sent_for_signing',
  'document.signature_recorded',
  'document.fully_signed',
  'document.voided',
  'document.regenerated',
  'document.reconciled',
  'document.generated',
  'document.archive_failed',
  // Email (Stage 4) — always internal
  'email.attempt',
  'email.accepted',
  'email.failed',
  'email.delivered',
  'email.bounced',
  'email.complained',
  'email.opened',
  // Domain (Stage 6 cutover from STE)
  'booking.confirmed',
  'booking.created',
  'booking.cancelled',
  'booking.expired',
  'booking.declined',
  'booking.awaiting_info',
  'booking.terms_updated',
  'bond.received_acknowledged',
  'bond.pending_cancelled_by_landlord',
  'bond.pending_expired',
  'payment_instructions.resent',
  'rent.agreed_override',
  'rent.invite_offer_applied',
  'signature.on_terminal_booking',
] as const

export type BookingEventType = (typeof BOOKING_EVENT_TYPES)[number]

export type BookingEventChange = {
  field: string
  old: unknown
  new: unknown
}

export type BookingEventDefaults = {
  audience: BookingEventAudience
  outcome: BookingEventOutcome
}

/**
 * Default audience/outcome per event type.
 * Email events are always internal (renter timeline must never claim "sent").
 */
export const BOOKING_EVENT_DEFAULTS: Record<BookingEventType, BookingEventDefaults> = {
  'booking.status_changed': { audience: 'both', outcome: 'n/a' },
  'booking.field_changed': { audience: 'internal', outcome: 'n/a' },
  'document.sent_for_signing': { audience: 'both', outcome: 'pending' },
  'document.signature_recorded': { audience: 'both', outcome: 'success' },
  'document.fully_signed': { audience: 'both', outcome: 'success' },
  'document.voided': { audience: 'internal', outcome: 'n/a' },
  'document.regenerated': { audience: 'internal', outcome: 'n/a' },
  'document.reconciled': { audience: 'internal', outcome: 'success' },
  'document.generated': { audience: 'internal', outcome: 'success' },
  'document.archive_failed': { audience: 'internal', outcome: 'failure' },
  'email.attempt': { audience: 'internal', outcome: 'pending' },
  'email.accepted': { audience: 'internal', outcome: 'success' },
  'email.failed': { audience: 'internal', outcome: 'failure' },
  'email.delivered': { audience: 'internal', outcome: 'success' },
  'email.bounced': { audience: 'internal', outcome: 'failure' },
  'email.complained': { audience: 'internal', outcome: 'failure' },
  'email.opened': { audience: 'internal', outcome: 'success' },
  'booking.confirmed': { audience: 'both', outcome: 'success' },
  'booking.created': { audience: 'both', outcome: 'success' },
  'booking.cancelled': { audience: 'both', outcome: 'n/a' },
  'booking.expired': { audience: 'both', outcome: 'n/a' },
  'booking.declined': { audience: 'both', outcome: 'n/a' },
  'booking.awaiting_info': { audience: 'both', outcome: 'pending' },
  'booking.terms_updated': { audience: 'both', outcome: 'success' },
  'bond.received_acknowledged': { audience: 'both', outcome: 'success' },
  'bond.pending_cancelled_by_landlord': { audience: 'both', outcome: 'n/a' },
  'bond.pending_expired': { audience: 'both', outcome: 'n/a' },
  'payment_instructions.resent': { audience: 'internal', outcome: 'n/a' },
  'rent.agreed_override': { audience: 'internal', outcome: 'success' },
  'rent.invite_offer_applied': { audience: 'internal', outcome: 'success' },
  'signature.on_terminal_booking': { audience: 'internal', outcome: 'failure' },
}

export function isBookingEventType(value: string): value is BookingEventType {
  return (BOOKING_EVENT_TYPES as readonly string[]).includes(value)
}

export function defaultsForEventType(eventType: string): BookingEventDefaults {
  if (isBookingEventType(eventType)) {
    return BOOKING_EVENT_DEFAULTS[eventType]
  }
  return { audience: 'internal', outcome: 'n/a' }
}

/** Force email.* to internal regardless of caller override mistakes. */
export function resolveAudience(
  eventType: string,
  requested: BookingEventAudience | undefined,
): BookingEventAudience {
  if (eventType.startsWith('email.')) {
    return 'internal'
  }
  if (requested === 'internal' || requested === 'both') {
    return requested
  }
  return defaultsForEventType(eventType).audience
}
