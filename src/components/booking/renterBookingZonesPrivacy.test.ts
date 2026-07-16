import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBookingActivityItems, type BookingEventRow } from '../../lib/booking/bookingActivityTimeline'

const root = resolve(import.meta.dirname, '../../..')

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf8')
}

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

describe('RenterBookingZones — privacy boundary (commit 8)', () => {
  it('tripwire: mounts BookingActivityTimeline in mode="renter" only, never mode="internal"', () => {
    const src = readSrc('src/components/booking/RenterBookingZones.tsx')
    expect(src).toContain('mode="renter"')
    expect(src).not.toContain('mode="internal"')
  })

  it('behavioural: buildBookingActivityItems(..., "renter") surfaces only audience=both events — no internal, no email', () => {
    const items = buildBookingActivityItems(
      [
        // internal-only, non-email — must be dropped for the renter.
        event({
          id: 'ai-note',
          event_type: 'booking.ai_assessment_generated',
          audience: 'internal',
          outcome: 'success',
          occurred_at: '2026-07-11T09:00:00.000Z',
        }),
        // internal email event — must be dropped for the renter (hard privacy boundary).
        event({
          id: 'email',
          event_type: 'email.delivered',
          audience: 'internal',
          outcome: 'success',
          correlation_id: 'c-email-1',
          metadata: { template_key: 'listing_payment_instructions', to_masked: ['sa***@gmail.com'] },
          occurred_at: '2026-07-11T09:05:00.000Z',
        }),
        // audience=both — must surface.
        event({
          id: 'confirm',
          event_type: 'booking.confirmed',
          audience: 'both',
          outcome: 'success',
          actor_type: 'landlord',
          actor_label: 'Quinn Lee',
          occurred_at: '2026-07-11T10:00:00.000Z',
        }),
        event({
          id: 'signed',
          event_type: 'document.fully_signed',
          audience: 'both',
          outcome: 'success',
          provider_ref: '165',
          occurred_at: '2026-07-12T10:00:00.000Z',
        }),
      ],
      'renter',
    )

    expect(items).toHaveLength(2)
    expect(items.every((i) => i.key !== 'ai-note' && i.key !== 'email')).toBe(true)
    expect(items.every((i) => !i.title.toLowerCase().includes('email'))).toBe(true)
    expect(items.every((i) => !i.detail?.toLowerCase().includes('email'))).toBe(true)
  })

  it('privilege: still does not host the landlord terms editor (see landlordBookingTermsEditorPrivilege.test.ts)', () => {
    const src = readSrc('src/components/booking/RenterBookingZones.tsx')
    expect(src).not.toContain('LandlordBookingTermsEditor')
    expect(src).not.toContain('BookingReviewTermsRail')
  })
})
