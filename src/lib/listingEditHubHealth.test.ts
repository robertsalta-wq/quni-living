import { describe, expect, it } from 'vitest'
import {
  computeListingHubHealth,
  fieldsFromHubListingTypeTile,
  hubListingTypeTileFromFields,
  listingHubPath,
  listingHubSectionStatus,
} from './listingEditHubHealth'

const empty = {
  title: '',
  propertyType: null,
  roomType: null,
  isRegisteredRoomingHouse: false,
  bedrooms: null,
  bathrooms: null,
  furnished: false,
  linenSupplied: false,
  weeklyCleaning: false,
  featureCount: 0,
  houseRulesText: '',
  selectedRulesCount: 0,
  address: '',
  suburb: '',
  state: '',
  postcode: '',
  description: '',
  rentPerWeek: 0,
  availableFrom: '',
  images: [] as string[],
  status: 'draft' as const,
}

describe('listingEditHubHealth', () => {
  it('marks basic complete when title and type are set', () => {
    expect(
      listingHubSectionStatus('basic', {
        ...empty,
        title: 'Sunny room',
        propertyType: 'private_room_landlord_off_site',
      }),
    ).toBe('complete')
  })

  it('marks photos attention when under 3 images', () => {
    expect(
      listingHubSectionStatus('photos', {
        ...empty,
        images: ['https://cdn.example/a.jpg'],
      }),
    ).toBe('attention')
  })

  it('computes equal-weight score and setup mode for drafts', () => {
    const health = computeListingHubHealth(
      {
        ...empty,
        title: 'Casa',
        propertyType: 'entire_property',
        bedrooms: 2,
        bathrooms: 1,
        address: '1 Main St',
        suburb: 'Kensington',
        state: 'NSW',
        postcode: '2033',
        status: 'draft',
      },
      { isNewListing: false },
    )
    expect(health.isSetupMode).toBe(true)
    expect(health.statuses.basic).toBe('complete')
    expect(health.statuses.property).toBe('complete')
    expect(health.statuses.location).toBe('complete')
    expect(health.completeCount).toBe(3)
    expect(health.score).toBe(38)
  })

  it('maps hub listing type tiles to accommodation fields', () => {
    expect(hubListingTypeTileFromFields('entire_property', 'house', false)).toBe('entire')
    expect(hubListingTypeTileFromFields('private_room_landlord_off_site', 'single', true)).toBe(
      'rooming',
    )
    expect(
      fieldsFromHubListingTypeTile('room', {
        propertyListingType: 'entire_property',
        roomType: 'apartment',
      }),
    ).toEqual({
      propertyListingType: 'private_room_landlord_off_site',
      roomType: 'single',
      isRegisteredRoomingHouse: false,
    })
  })

  it('builds hub paths for new and edit', () => {
    expect(listingHubPath({ propertyId: null })).toBe('/landlord/property/new')
    expect(listingHubPath({ propertyId: 'abc', view: 'basic' })).toBe(
      '/landlord/property/edit/abc/basic',
    )
    expect(listingHubPath({ propertyId: 'abc', view: 'photos' })).toBe(
      '/landlord/property/edit/abc/section/photos',
    )
  })
})
