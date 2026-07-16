import { describe, expect, it } from 'vitest'

import {
  LISTING_BOND_DONE_FIELD,
  LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS,
  maybeAdvanceListingBookingToActive,
} from './maybeAdvanceListingBookingToActive.js'
import {
  STATUS_LIFECYCLE,
  UI_BOOKING_REVIEW_STATUSES,
  type BookingStatus,
} from './statusLifecycle.js'

function allDeclaredStatuses(): Set<BookingStatus> {
  const s = new Set<BookingStatus>()
  for (const st of STATUS_LIFECYCLE.listing.statuses) s.add(st)
  for (const st of STATUS_LIFECYCLE.managed.statuses) s.add(st)
  for (const st of UI_BOOKING_REVIEW_STATUSES) s.add(st)
  return s
}

describe('STATUS_LIFECYCLE invariant', () => {
  it('every UI booking-review status exists in the declared map (listing ∪ managed ∪ UI list)', () => {
    const declared = allDeclaredStatuses()
    for (const status of UI_BOOKING_REVIEW_STATUSES) {
      expect(declared.has(status), `UI status missing from lifecycle map: ${status}`).toBe(true)
    }
  })

  it('every status an edge writes to exists on that tier', () => {
    for (const tier of ['listing', 'managed'] as const) {
      const life = STATUS_LIFECYCLE[tier]
      const statusSet = new Set(life.statuses)
      for (const edge of life.edges) {
        expect(
          statusSet.has(edge.to),
          `${tier}: edge ${edge.from}→${edge.to} writes status not listed on tier`,
        ).toBe(true)
        expect(
          statusSet.has(edge.from),
          `${tier}: edge ${edge.from}→${edge.to} from-status not listed on tier`,
        ).toBe(true)
      }
    }
  })

  it('Listing has a Listing-capable writer for confirmed→active bound to maybeAdvanceListingBookingToActive', () => {
    const edge = STATUS_LIFECYCLE.listing.edges.find((e) => e.from === 'confirmed' && e.to === 'active')
    expect(edge, 'Listing missing confirmed→active edge').toBeTruthy()
    expect(edge!.writer).toBe('maybeAdvanceListingBookingToActive')
    expect(edge!.writerFn).toBe(maybeAdvanceListingBookingToActive)
    expect(typeof maybeAdvanceListingBookingToActive).toBe('function')
  })

  it('completed is terminal/unused on Listing (no writer required)', () => {
    expect(STATUS_LIFECYCLE.listing.terminalOrUnused).toContain('completed')
    const writesToCompleted = STATUS_LIFECYCLE.listing.edges.filter((e) => e.to === 'completed')
    expect(writesToCompleted).toHaveLength(0)
  })

  it('Listing bond-done for status advance is bond_received_by_landlord_at only — not RTA fields', () => {
    expect(STATUS_LIFECYCLE.listingBondDoneField).toBe(LISTING_BOND_DONE_FIELD)
    expect(STATUS_LIFECYCLE.listingBondDoneField).toBe('bond_received_by_landlord_at')

    for (const field of LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS) {
      expect(
        STATUS_LIFECYCLE.listingBondDoneNotAlternateFields,
        `RTA/record-only field ${field} must be listed as NOT an alternate Listing bond-done signal`,
      ).toContain(field)
      expect(field).not.toBe(STATUS_LIFECYCLE.listingBondDoneField)
    }

    // Helper source must not treat RTA columns as the bond guard (string check on exported constants).
    expect(LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS).toContain('rta_bond_lodged_at')
  })
})
