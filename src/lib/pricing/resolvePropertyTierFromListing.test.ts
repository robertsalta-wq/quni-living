import { describe, expect, it } from 'vitest'

import { resolvePropertyTierFromListing } from './index'

describe('resolvePropertyTierFromListing', () => {
  it('QLD off-site room is t3 whether or not the registered flag is set', () => {
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
      }),
    ).toBe('t3')
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: true,
      }),
    ).toBe('t3')
  })

  it('QLD off-site room that does not share a kitchen or bathroom is t2', () => {
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'private_room_landlord_off_site',
        sharesKitchenOrBathroom: false,
      }),
    ).toBe('t2')
  })

  it('QLD entire place is t2', () => {
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'entire_property',
        isRegisteredRoomingHouse: false,
      }),
    ).toBe('t2')
  })

  it('QLD on-site uses the rooms-let count', () => {
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'private_room_landlord_on_site',
        roomsRentedToResidents: 3,
      }),
    ).toBe('t1')
    expect(
      resolvePropertyTierFromListing({
        state: 'QLD',
        propertyType: 'private_room_landlord_on_site',
        roomsRentedToResidents: 4,
      }),
    ).toBe('t3')
  })

  it('NSW still uses the registered flag', () => {
    expect(
      resolvePropertyTierFromListing({
        state: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
      }),
    ).toBe('t2')
    expect(
      resolvePropertyTierFromListing({
        state: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: true,
      }),
    ).toBe('t3')
  })
})
