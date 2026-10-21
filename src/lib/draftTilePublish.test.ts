import { describe, expect, it } from 'vitest'
import { draftTilePublishGap, type DraftTilePublishFields } from './draftTilePublish'

function ready(partial: Partial<DraftTilePublishFields> = {}): DraftTilePublishFields {
  return {
    id: 'listing-1',
    title: 'Sunny room',
    rent_per_week: 320,
    address: '12 Example St',
    suburb: 'Ryde',
    state: 'NSW',
    postcode: '2112',
    images: ['https://example.com/photo.jpg'],
    property_type: 'private_room_landlord_off_site',
    room_type: 'single',
    is_registered_rooming_house: false,
    ...partial,
  }
}

describe('draftTilePublishGap', () => {
  it('allows a draft that has title, type, address, rent, and a photo', () => {
    expect(draftTilePublishGap(ready())).toBeNull()
  })

  it('sends a missing title to basic info', () => {
    const gap = draftTilePublishGap(ready({ title: '  ' }))
    expect(gap?.section).toBe('basic')
    expect(gap?.href).toBe('/landlord/property/edit/listing-1/basic')
    expect(gap?.message).toMatch(/title/i)
  })

  it('sends a missing postcode to location', () => {
    const gap = draftTilePublishGap(ready({ postcode: null }))
    expect(gap?.section).toBe('location')
    expect(gap?.href).toBe('/landlord/property/edit/listing-1/section/location')
  })

  it('does not treat a missing postcode field on a stale cache as incomplete', () => {
    const { postcode: _ignored, ...withoutPostcode } = ready()
    expect(draftTilePublishGap(withoutPostcode)).toBeNull()
  })

  it('sends a zero rent to pricing', () => {
    expect(draftTilePublishGap(ready({ rent_per_week: 0 }))?.section).toBe('pricing')
  })

  it('sends a draft with no photo to photos', () => {
    expect(draftTilePublishGap(ready({ images: [] }))?.section).toBe('photos')
  })

  it('reports the earliest gap when several fields are missing', () => {
    expect(
      draftTilePublishGap(ready({ title: '', postcode: '', rent_per_week: 0, images: null }))?.section,
    ).toBe('basic')
  })
})
