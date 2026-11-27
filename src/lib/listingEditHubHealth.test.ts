import { describe, expect, it } from 'vitest'
import {
  computeListingHubHealth,
  fieldsFromHubListingTypeTile,
  hubListingTypeTileFromFields,
  listingHubPath,
  listingHubSectionIdsForState,
  listingHubSectionStatus,
  listingSectionSubtitle,
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
  it('describes each mobile step by what that step contains', () => {
    expect(listingSectionSubtitle('basic', 'NSW')).toBe('Listing title, type, and who can enquire')
    expect(listingSectionSubtitle('location', 'NSW')).toBe(
      'Address, suburb, state, postcode, and campus',
    )
    expect(listingSectionSubtitle('property', 'VIC')).toBe(
      'Accommodation type, bedrooms, and state questions',
    )
    expect(listingSectionSubtitle('inclusions', 'QLD')).toBe('Furnished, linen, cleaning, and features')
    expect(listingSectionSubtitle('services', 'NSW')).toBe('Smoke alarms, embedded networks, and strata')
    expect(listingSectionSubtitle('services', 'VIC')).toBe('Utilities, water, and how bills are shared')
    expect(listingSectionSubtitle('rules', 'NSW')).toBe('House rules - yes, no or on approval')
    expect(listingSectionSubtitle('pricing', 'NSW')).toBe('Rent, bond, availability, and surcharges')
    expect(listingSectionSubtitle('description', 'NSW')).toBe('Tell students about the place')
    expect(listingSectionSubtitle('photos', 'NSW')).toBe('Upload, reorder, add captions')
    expect(listingHubSectionIdsForState('NSW')).toHaveLength(9)
  })

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
    expect(health.statuses.services).toBe('notstarted')
    expect(health.score).toBe(33)
  })

  it('maps hub listing type tiles to accommodation fields', () => {
    expect(hubListingTypeTileFromFields('entire_property', 'house', false)).toBe('entire')
    expect(hubListingTypeTileFromFields('private_room_landlord_off_site', 'single', true)).toBe(
      'rooming',
    )
    expect(
      fieldsFromHubListingTypeTile('rooming', {
        propertyListingType: 'private_room_landlord_off_site',
        roomType: 'single',
      }, 'shared'),
    ).toEqual({
      propertyListingType: 'shared_room',
      roomType: 'shared',
      isRegisteredRoomingHouse: true,
    })
    expect(hubListingTypeTileFromFields('shared_room', 'shared', false)).toBe('room')
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
