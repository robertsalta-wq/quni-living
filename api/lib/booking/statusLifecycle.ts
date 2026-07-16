/**
 * Declared booking status lifecycle — per-tier reachable edges and writers.
 * Used by the invariant test so Listing confirmed→active cannot go missing silently.
 *
 * Bond-done for Listing status advance: bond_received_by_landlord_at ONLY
 * (see LISTING_BOND_DONE_* in maybeAdvanceListingBookingToActive). RTA fields are record-only.
 */
import {
  LISTING_BOND_DONE_FIELD,
  LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS,
  maybeAdvanceListingBookingToActive,
} from './maybeAdvanceListingBookingToActive.js'

export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'awaiting_info'
  | 'bond_pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'payment_failed'

export type StatusLifecycleEdge = {
  from: BookingStatus
  to: BookingStatus
  /** Human / module label for the writer */
  writer: string
  /** Symbol that must remain imported — deleting the helper breaks this module's load */
  writerFn?: (...args: never[]) => unknown
}

export type TierLifecycle = {
  statuses: BookingStatus[]
  edges: StatusLifecycleEdge[]
  /** Statuses that need no writer (terminal or unused) */
  terminalOrUnused: BookingStatus[]
}

/**
 * Binding the Listing confirmed→active edge to the real helper symbol.
 * On main without this helper file, importing this module fails (import/compile) — that is the CI proof.
 */
const LISTING_CONFIRMED_TO_ACTIVE_WRITER = maybeAdvanceListingBookingToActive

export const STATUS_LIFECYCLE = {
  listing: {
    statuses: [
      'pending_confirmation',
      'awaiting_info',
      'bond_pending',
      'confirmed',
      'active',
      'cancelled',
      'declined',
      'expired',
      'completed',
    ],
    terminalOrUnused: ['completed'],
    edges: [
      {
        from: 'pending_confirmation',
        to: 'bond_pending',
        writer: 'confirmListing',
      },
      {
        from: 'awaiting_info',
        to: 'bond_pending',
        writer: 'confirmListing',
      },
      {
        from: 'bond_pending',
        to: 'confirmed',
        writer: 'markBondReceived',
      },
      {
        from: 'confirmed',
        to: 'active',
        writer: 'maybeAdvanceListingBookingToActive',
        writerFn: LISTING_CONFIRMED_TO_ACTIVE_WRITER,
      },
      {
        from: 'bond_pending',
        to: 'cancelled',
        writer: 'cancelListingBooking',
      },
      {
        from: 'bond_pending',
        to: 'expired',
        writer: 'expireListingBondPending',
      },
    ],
  } satisfies TierLifecycle,

  managed: {
    statuses: [
      'pending_confirmation',
      'awaiting_info',
      'confirmed',
      'active',
      'declined',
      'expired',
      'payment_failed',
      'completed',
    ],
    terminalOrUnused: ['completed'],
    edges: [
      {
        from: 'pending_confirmation',
        to: 'confirmed',
        writer: 'confirmManaged',
      },
      {
        from: 'confirmed',
        to: 'active',
        writer: 'release-deposits (Managed only)',
      },
    ],
  } satisfies TierLifecycle,

  /** Sole Listing bond-done field for confirmed→active (not RTA lodgement). */
  listingBondDoneField: LISTING_BOND_DONE_FIELD,
  listingBondDoneNotAlternateFields: LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS,
} as const

/** Statuses the booking-review UI action model branches on. */
export const UI_BOOKING_REVIEW_STATUSES: BookingStatus[] = [
  'pending',
  'pending_payment',
  'pending_confirmation',
  'awaiting_info',
  'bond_pending',
  'confirmed',
  'active',
  'completed',
  'declined',
  'cancelled',
  'expired',
  'payment_failed',
]
