import { describe, expect, it } from 'vitest'
import {
  KNOWN_SMOKE_BOOKING_IDS,
  classifySignedNotReserving,
  type SignedNotReservingRow,
} from './classifySignedNotReserving.js'

function row(partial: Partial<SignedNotReservingRow> & Pick<SignedNotReservingRow, 'bookingId' | 'bookingStatus'>): SignedNotReservingRow {
  return {
    docStatus: partial.docStatus ?? null,
    landlordSignedAt: partial.landlordSignedAt ?? null,
    studentSignedAt: partial.studentSignedAt ?? null,
    ...partial,
  }
}

const signed = {
  docStatus: 'signed' as const,
  landlordSignedAt: '2026-07-01T00:00:00Z',
  studentSignedAt: '2026-07-01T01:00:00Z',
}

describe('classifySignedNotReserving', () => {
  it('expired + signed → one action item', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'aaa', bookingStatus: 'expired', ...signed }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'signed-on-expired',
      tone: 'action',
      text: '1 signed lease on an expired booking',
    })
    expect(items[0].fixHref).toContain('status=expired')
    expect(items[0].fixHref).toContain('selected=aaa')
  })

  it('cancelled + signed → one watch investigate item', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'bbb', bookingStatus: 'cancelled', ...signed }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'signed-on-withdrawn',
      tone: 'watch',
    })
    expect(items[0].text).toMatch(/investigate/i)
    expect(items[0].text).not.toMatch(/reinstate/i)
  })

  it('declined + signed → watch tier', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'ccc', bookingStatus: 'declined', ...signed }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].tone).toBe('watch')
  })

  it('bond_pending + signed → none', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'ddd', bookingStatus: 'bond_pending', ...signed }),
    ])
    expect(items).toEqual([])
  })

  it('confirmed/active + signed → none', () => {
    expect(
      classifySignedNotReserving([
        row({ bookingId: 'e1', bookingStatus: 'confirmed', ...signed }),
        row({ bookingId: 'e2', bookingStatus: 'active', ...signed }),
      ]),
    ).toEqual([])
  })

  it('expired + unsigned → none', () => {
    const items = classifySignedNotReserving([
      row({
        bookingId: 'fff',
        bookingStatus: 'expired',
        docStatus: 'sent',
        landlordSignedAt: '2026-07-01T00:00:00Z',
        studentSignedAt: null,
      }),
    ])
    expect(items).toEqual([])
  })

  it('fully signed via timestamps without status=signed', () => {
    const items = classifySignedNotReserving([
      row({
        bookingId: 'ggg',
        bookingStatus: 'expired',
        docStatus: 'awaiting_signatures',
        landlordSignedAt: '2026-07-01T00:00:00Z',
        studentSignedAt: '2026-07-01T01:00:00Z',
      }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].tone).toBe('action')
  })

  it('known smoke id excluded by default denylist', () => {
    const smokeId = [...KNOWN_SMOKE_BOOKING_IDS][0]
    const items = classifySignedNotReserving([
      row({ bookingId: smokeId, bookingStatus: 'cancelled', ...signed }),
    ])
    expect(items).toEqual([])
  })

  it('extra smokeBookingIds excluded', () => {
    const items = classifySignedNotReserving(
      [row({ bookingId: 'smoke-extra', bookingStatus: 'expired', ...signed })],
      { smokeBookingIds: new Set(['smoke-extra']) },
    )
    expect(items).toEqual([])
  })

  it('aggregates multiple expired into one attention item', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'a1', bookingStatus: 'expired', ...signed }),
      row({ bookingId: 'a2', bookingStatus: 'expired', ...signed }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('2 signed leases on expired bookings')
    expect(items[0].fixHref).toBe('/admin/bookings?status=expired')
  })

  it('emits both tiers when both classes present', () => {
    const items = classifySignedNotReserving([
      row({ bookingId: 'x1', bookingStatus: 'expired', ...signed }),
      row({ bookingId: 'x2', bookingStatus: 'cancelled', ...signed }),
    ])
    expect(items.map((i) => i.id)).toEqual(['signed-on-expired', 'signed-on-withdrawn'])
  })
})
