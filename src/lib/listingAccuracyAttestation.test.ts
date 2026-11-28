import { describe, expect, it } from 'vitest'
import { buildListingAccuracyMaterialPayload, type ListingAccuracyMaterialFields } from './listingAccuracyAttestation'

const fields: ListingAccuracyMaterialFields = {
  rent_per_week: 500,
  together_weekly_rent: null,
  bond: 2000,
  bond_weeks: 4,
  room_type: 'single',
  max_occupants: 1,
  available_from: null,
  available_to: null,
  furnished: true,
  images: null,
  house_rules: null,
  structured_house_rules: [],
  amenity_feature_ids: [],
}

describe('buildListingAccuracyMaterialPayload', () => {
  it('always includes the two-together price, including when it is off', () => {
    const payload = buildListingAccuracyMaterialPayload(fields)
    expect(payload.together_weekly_rent).toBeNull()
    expect(buildListingAccuracyMaterialPayload({ ...fields, together_weekly_rent: 600 }).together_weekly_rent).toBe(600)
  })
})
