import { describe, expect, it } from 'vitest'
import {
  countLandlordListingsByUiStatus,
  groupLandlordListings,
  toLandlordListingUiStatus,
  type LandlordListingForGroup,
} from './landlordListingsGrouped'

function listing(
  partial: Partial<LandlordListingForGroup> & Pick<LandlordListingForGroup, 'id' | 'title'>,
): LandlordListingForGroup {
  return {
    slug: partial.slug ?? partial.id,
    rent_per_week: partial.rent_per_week ?? 300,
    room_type: partial.room_type ?? 'single',
    suburb: partial.suburb ?? 'Ryde',
    address: partial.address ?? '12 Example St',
    images: null,
    status: partial.status ?? 'active',
    property_type: partial.property_type ?? 'private_room_landlord_off_site',
    property_group_id: partial.property_group_id ?? null,
    bedrooms: partial.bedrooms ?? 4,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
    service_tier: partial.service_tier ?? 'listing',
    ...partial,
  }
}

describe('toLandlordListingUiStatus', () => {
  it('maps active + occupying booking to booked', () => {
    expect(
      toLandlordListingUiStatus({ id: 'a', status: 'active' }, [
        { property_id: 'a', status: 'confirmed' },
      ]),
    ).toBe('booked')
  })

  it('maps active without booking to live', () => {
    expect(toLandlordListingUiStatus({ id: 'a', status: 'active' }, [])).toBe('live')
  })

  it('maps inactive to paused', () => {
    expect(toLandlordListingUiStatus({ id: 'a', status: 'inactive' }, [])).toBe('paused')
  })
})

describe('groupLandlordListings', () => {
  it('groups rooms by property_group_id and rolls up statuses', () => {
    const groups = groupLandlordListings(
      [
        listing({ id: '1', title: 'Room 1', property_group_id: 'g1', status: 'active' }),
        listing({ id: '2', title: 'Room 2', property_group_id: 'g1', status: 'draft' }),
        listing({
          id: '3',
          title: 'Whole house',
          property_type: 'entire_property',
          room_type: 'house',
          address: '99 Other St',
          status: 'active',
        }),
      ],
      [{ property_id: '1', status: 'active' }],
    )

    expect(groups).toHaveLength(2)
    const rooms = groups.find((g) => g.kind === 'rooms')
    const whole = groups.find((g) => g.kind === 'whole_place')
    expect(rooms?.listings).toHaveLength(2)
    expect(rooms?.rollup.booked).toBe(1)
    expect(rooms?.rollup.draft).toBe(1)
    expect(rooms?.rollup.vacant).toBe(2) // 4 beds - 2 listed
    expect(whole?.kind).toBe('whole_place')
  })

  it('filters rooms by status chip and hides empty properties', () => {
    const groups = groupLandlordListings(
      [
        listing({ id: '1', title: 'Room 1', property_group_id: 'g1', status: 'active' }),
        listing({ id: '2', title: 'Room 2', property_group_id: 'g1', status: 'draft' }),
      ],
      [],
      { statusFilter: 'draft' },
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].visibleListings.map((l) => l.id)).toEqual(['2'])
  })

  it('counts filter chips from the listing set', () => {
    const counts = countLandlordListingsByUiStatus(
      [
        listing({ id: '1', title: 'A', status: 'active' }),
        listing({ id: '2', title: 'B', status: 'draft' }),
        listing({ id: '3', title: 'C', status: 'inactive' }),
      ],
      [{ property_id: '1', status: 'confirmed' }],
    )
    expect(counts).toEqual({ all: 3, live: 0, booked: 1, draft: 1, paused: 1 })
  })
})
