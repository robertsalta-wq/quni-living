import { describe, expect, it } from 'vitest'
import {
  buildBookingActivityItems,
  formatChangesInline,
  type BookingEventRow,
} from './bookingActivityTimeline'
import { renterBookingObligation } from './renterBookingObligation'

function event(partial: Partial<BookingEventRow> & Pick<BookingEventRow, 'event_type'>): BookingEventRow {
  return {
    id: partial.id ?? `evt-${Math.random().toString(36).slice(2, 8)}`,
    booking_id: 'book-1',
    landlord_id: 'll-1',
    student_id: 'st-1',
    event_type: partial.event_type,
    occurred_at: partial.occurred_at ?? '2026-07-12T08:00:00.000Z',
    created_at: partial.created_at ?? partial.occurred_at ?? '2026-07-12T08:00:00.000Z',
    audience: partial.audience ?? 'both',
    outcome: partial.outcome ?? 'n/a',
    actor_type: partial.actor_type ?? 'system',
    actor_id: partial.actor_id ?? null,
    actor_label: partial.actor_label ?? null,
    changes: partial.changes ?? null,
    reason: partial.reason ?? null,
    provider: partial.provider ?? null,
    provider_ref: partial.provider_ref ?? null,
    correlation_id: partial.correlation_id ?? null,
    document_id: partial.document_id ?? null,
    metadata: partial.metadata ?? {},
    schema_version: partial.schema_version ?? 1,
  }
}

describe('formatChangesInline', () => {
  it('formats old → new diffs', () => {
    expect(
      formatChangesInline([
        { field: 'lease_length', old: '6 months', new: '3 months' },
        { field: 'end_date', old: '2026-01-16', new: '2026-10-16' },
      ]),
    ).toContain('lease term')
  })
})

describe('buildBookingActivityItems', () => {
  it('collapses email rows by correlation_id on internal view', () => {
    const items = buildBookingActivityItems(
      [
        event({
          id: 'a',
          event_type: 'email.attempt',
          audience: 'internal',
          outcome: 'pending',
          correlation_id: 'c1',
          occurred_at: '2026-07-11T01:00:00.000Z',
          metadata: { template_key: 'listing_payment_instructions', to_masked: ['sa***@gmail.com'] },
        }),
        event({
          id: 'b',
          event_type: 'email.accepted',
          audience: 'internal',
          outcome: 'success',
          correlation_id: 'c1',
          provider: 'resend',
          provider_ref: 're_1',
          occurred_at: '2026-07-11T01:00:01.000Z',
          metadata: { template_key: 'listing_payment_instructions', to_masked: ['sa***@gmail.com'] },
        }),
        event({
          id: 'c',
          event_type: 'email.bounced',
          audience: 'internal',
          outcome: 'failure',
          correlation_id: 'c1',
          occurred_at: '2026-07-11T01:05:00.000Z',
          metadata: { template_key: 'listing_payment_instructions' },
        }),
      ],
      'internal',
    )

    expect(items).toHaveLength(1)
    expect(items[0].tone).toBe('danger')
    expect(items[0].title.toLowerCase()).toContain('payment instructions')
    expect(items[0].detail?.toLowerCase()).toContain('bounced')
  })

  it('filters renter view to audience both and softens copy', () => {
    const items = buildBookingActivityItems(
      [
        event({
          id: 'email',
          event_type: 'email.delivered',
          audience: 'internal',
          outcome: 'success',
        }),
        event({
          id: 'signed',
          event_type: 'document.fully_signed',
          audience: 'both',
          outcome: 'success',
          provider_ref: '165',
          occurred_at: '2026-07-12T10:00:00.000Z',
        }),
        event({
          id: 'confirm',
          event_type: 'booking.confirmed',
          audience: 'both',
          outcome: 'success',
          actor_label: 'Quinn Lee',
          actor_type: 'landlord',
          occurred_at: '2026-07-11T10:00:00.000Z',
        }),
      ],
      'renter',
    )

    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('You signed your tenancy agreement')
    expect(items[0].detail?.toLowerCase()).not.toContain('165')
    expect(items[1].title).toBe('Your booking was accepted')
    expect(items.every((i) => !i.title.toLowerCase().includes('email'))).toBe(true)
  })

  it('sorts newest first', () => {
    const items = buildBookingActivityItems(
      [
        event({ id: 'old', event_type: 'booking.created', occurred_at: '2026-07-10T10:00:00.000Z' }),
        event({ id: 'new', event_type: 'booking.confirmed', occurred_at: '2026-07-12T10:00:00.000Z' }),
      ],
      'internal',
    )
    expect(items[0].key).toBe('new')
    expect(items[1].key).toBe('old')
  })
})

describe('renterBookingObligation', () => {
  it('pins bond due from current booking state', () => {
    const band = renterBookingObligation({
      status: 'bond_pending',
      bond_amount: 1000,
      bond_window_expires_at: '2026-07-18T00:00:00.000Z',
      bond_received_by_landlord_at: null,
    })
    expect(band?.title).toBe('Bond payment due')
    expect(band?.detail).toContain('$1,000')
    expect(band?.detail).toContain('18 July')
  })

  it('returns null when nothing is outstanding', () => {
    expect(
      renterBookingObligation({
        status: 'confirmed',
        bond_received_by_landlord_at: '2026-07-12T00:00:00.000Z',
      }),
    ).toBeNull()
  })
})
