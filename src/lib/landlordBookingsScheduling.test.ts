import { describe, expect, it } from 'vitest'
import type { LandlordListingForGroup } from './landlordListingsGrouped'
import {
  buildCalendarEvents,
  buildNext7Days,
  buildSchedulingWindow,
  buildTimelineModel,
  parseBookingsScheduleView,
  pctInWindow,
  spanPct,
  toIsoDate,
  type SchedulingBooking,
} from './landlordBookingsScheduling'

function listing(
  partial: Partial<LandlordListingForGroup> & Pick<LandlordListingForGroup, 'id' | 'title'>,
): LandlordListingForGroup {
  return {
    slug: partial.slug ?? partial.id,
    rent_per_week: partial.rent_per_week ?? 500,
    room_type: partial.room_type ?? 'single',
    suburb: partial.suburb ?? 'Ryde',
    address: partial.address ?? '14 Blaxland Rd',
    images: null,
    status: partial.status ?? 'active',
    property_type: partial.property_type ?? 'private_room_landlord_off_site',
    property_group_id: partial.property_group_id ?? 'g1',
    bedrooms: partial.bedrooms ?? 3,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
    service_tier: partial.service_tier ?? 'listing',
    ...partial,
  }
}

describe('parseBookingsScheduleView', () => {
  it('defaults to requests', () => {
    expect(parseBookingsScheduleView(null)).toBe('requests')
    expect(parseBookingsScheduleView('nope')).toBe('requests')
  })
  it('accepts calendar and timeline', () => {
    expect(parseBookingsScheduleView('calendar')).toBe('calendar')
    expect(parseBookingsScheduleView('timeline')).toBe('timeline')
  })
})

describe('buildSchedulingWindow', () => {
  it('anchors Jul 2026 to Jul–Dec', () => {
    const w = buildSchedulingWindow(new Date(2026, 6, 17))
    expect(w.startIso).toBe('2026-07-01')
    expect(w.endIso).toBe('2026-12-31')
    expect(w.todayIso).toBe('2026-07-17')
  })
})

describe('spanPct / pctInWindow', () => {
  it('full-window bar is 0–100 with no overflow', () => {
    const w = buildSchedulingWindow(new Date(2026, 6, 17))
    const span = spanPct(w.startIso, w.endIso, w)
    expect(span.leftPct).toBe(0)
    expect(span.widthPct).toBe(100)
  })

  it('today sits mid-window in July', () => {
    const w = buildSchedulingWindow(new Date(2026, 6, 17))
    const pct = pctInWindow('2026-07-17', w)
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThan(20)
  })
})

describe('buildTimelineModel', () => {
  const today = new Date(2026, 6, 17)

  it('builds occupied, upcoming, empty bars and stats', () => {
    const listings = [
      listing({ id: 'room-a', title: 'Room A', rent_per_week: 500 }),
      listing({ id: 'room-b', title: 'Room B', rent_per_week: 450, address: '8 Wharf St', suburb: 'Liverpool', property_group_id: 'g2' }),
    ]
    const bookings: SchedulingBooking[] = [
      {
        id: 'b1',
        property_id: 'room-a',
        status: 'active',
        move_in_date: '2026-03-01',
        start_date: '2026-03-01',
        end_date: '2026-08-22',
        weekly_rent: 500,
        student_name: 'Sahil Harriram',
      },
      {
        id: 'b2',
        property_id: 'room-a',
        status: 'confirmed',
        move_in_date: '2026-09-01',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        weekly_rent: 500,
        student_name: 'Priya Nadkumar',
      },
      {
        id: 'b3',
        property_id: 'room-b',
        status: 'pending_confirmation',
        move_in_date: '2026-08-01',
        start_date: '2026-08-01',
        end_date: '2026-12-01',
        weekly_rent: 450,
        student_name: 'Amara Okoye',
      },
    ]

    const model = buildTimelineModel(listings, bookings, today)
    expect(model.stats.totalRooms).toBe(2)
    expect(model.stats.occupiedNow).toBe(1)
    expect(model.stats.requestsAwaiting).toBe(1)
    expect(model.stats.leasesEndingSoon).toBe(1) // Sahil ends 22 Aug ≈ 36d

    const roomA = model.groups.flatMap((g) => g.rooms).find((r) => r.propertyId === 'room-a')
    expect(roomA).toBeTruthy()
    expect(roomA!.bars.some((b) => b.kind === 'occupied')).toBe(true)
    expect(roomA!.bars.some((b) => b.kind === 'upcoming')).toBe(true)
    expect(roomA!.bars.some((b) => b.kind === 'empty')).toBe(true)
    expect(roomA!.markers.some((m) => m.kind === 'lease_end')).toBe(true)

    const roomB = model.groups.flatMap((g) => g.rooms).find((r) => r.propertyId === 'room-b')
    expect(roomB!.markers.some((m) => m.kind === 'pending_request')).toBe(true)
    expect(roomB!.bars.every((b) => b.kind === 'empty' || b.widthPct <= 100)).toBe(true)
  })
})

describe('buildCalendarEvents', () => {
  it('colour-codes move-in, lease end, pending, bond', () => {
    const events = buildCalendarEvents(
      [
        {
          id: 'b1',
          property_id: 'p1',
          status: 'active',
          move_in_date: '2026-07-17',
          start_date: '2026-07-17',
          end_date: '2026-07-30',
          weekly_rent: 500,
          student_name: 'Sahil Harriram',
          property_title: '14 Blaxland Rd',
          service_tier: 'managed',
        },
        {
          id: 'b2',
          property_id: 'p2',
          status: 'pending_confirmation',
          move_in_date: '2026-07-20',
          start_date: '2026-07-20',
          end_date: '2026-12-01',
          weekly_rent: 400,
          student_name: 'Amara Okoye',
        },
        {
          id: 'b3',
          property_id: 'p3',
          status: 'bond_pending',
          move_in_date: '2026-07-25',
          start_date: '2026-07-25',
          end_date: '2026-12-01',
          weekly_rent: 450,
          confirmed_at: '2026-07-17',
          student_name: 'Priya Nadkumar',
        },
      ],
      { today: new Date(2026, 6, 17), monthIso: '2026-07-01' },
    )

    expect(events.some((e) => e.kind === 'move_in')).toBe(true)
    expect(events.some((e) => e.kind === 'move_out')).toBe(true)
    expect(events.some((e) => e.kind === 'pending_request')).toBe(true)
    expect(events.some((e) => e.kind === 'bond_due')).toBe(true)
    expect(events.some((e) => e.kind === 'rent_payout')).toBe(true)
  })
})

describe('buildNext7Days', () => {
  it('returns date-ordered tagged actions', () => {
    const items = buildNext7Days(
      [
        {
          id: 'b1',
          property_id: 'p1',
          status: 'pending_confirmation',
          move_in_date: '2026-08-01',
          start_date: '2026-08-01',
          end_date: '2026-12-01',
          weekly_rent: 400,
          student_name: 'Amara Okoye',
        },
        {
          id: 'b2',
          property_id: 'p2',
          status: 'active',
          move_in_date: '2026-07-17',
          start_date: '2026-07-17',
          end_date: '2026-12-01',
          weekly_rent: 500,
          student_name: 'Sahil Harriram',
          service_tier: 'managed',
        },
      ],
      new Date(2026, 6, 17),
    )

    expect(items.length).toBeGreaterThan(0)
    expect(items[0]!.tag).toBe('Urgent')
    expect(items.some((i) => i.title.includes('Move-in today'))).toBe(true)
    for (let i = 1; i < items.length; i++) {
      expect(items[i]!.dateIso >= items[i - 1]!.dateIso).toBe(true)
    }
  })
})

describe('toIsoDate', () => {
  it('formats local date without UTC shift', () => {
    expect(toIsoDate(new Date(2026, 6, 17))).toBe('2026-07-17')
  })
})
