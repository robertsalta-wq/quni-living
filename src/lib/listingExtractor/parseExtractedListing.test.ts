import { describe, expect, it } from 'vitest'
import { DEFAULT_BOND_WEEKS } from '../booking/resolveBookingBondAmount'
import { applyExtractedListingToDraft, emptyExtractorDraftBase } from './applyExtractedDraft'
import { resolveFeatureNamesToIds } from './featureNameResolve'
import { parseExtractedListing, parseExtractedListingWithMeta } from './parseExtractedListing'

const CATALOG = [
  { id: 'f-wifi', name: 'WiFi' },
  { id: 'f-park', name: 'Parking' },
  { id: 'f-bills', name: 'Bills included' },
  { id: 'f-desk', name: 'Study desk' },
]

const FACEBOOK_MESSY = JSON.stringify({
  title: { value: 'Sunny room near UNSW Kensington', confidence: 'high' },
  description: {
    value: 'hey guys!! room available in share house near uni, bills included wifi parking. dm me',
    confidence: 'high',
  },
  rentPerWeek: { value: '280', confidence: 'high' },
  bedrooms: { value: '4', confidence: 'low' },
  bathrooms: { value: '2', confidence: 'low' },
  furnished: { value: true, confidence: 'low' },
  features: { value: ['WiFi', 'Parking', 'Bills included', 'Netflix'], confidence: 'high' },
  suburb: { value: 'Kensington', confidence: 'high' },
  state: { value: 'NSW', confidence: 'high' },
  accommodationHint: { value: 'reads like a private room in a share house', confidence: 'low' },
  propertyListingType: 'private_room_landlord_off_site',
  bondWeeks: '4',
})

const FLATMATES_AD = JSON.stringify({
  title: { value: 'Master bedroom Randwick', confidence: 'high' },
  rentPerWeek: { value: 350, confidence: 'high' },
  bedrooms: { value: '1', confidence: 'high' },
  bathrooms: { value: '1', confidence: 'high' },
  maxOccupants: { value: '1', confidence: 'high' },
  furnished: { value: true, confidence: 'high' },
  linenSupplied: { value: true, confidence: 'low' },
  features: { value: ['wifi', 'study desk'], confidence: 'high' },
  address: { value: '12 Example St', confidence: 'high' },
  suburb: { value: 'Randwick', confidence: 'high' },
  postcode: { value: '2031', confidence: 'high' },
  leaseLength: { value: '6 months', confidence: 'high' },
  availableFrom: { value: '2026-08-15', confidence: 'high' },
  parkingAvailable: { value: false, confidence: 'high' },
})

const GUMTREE_AD = JSON.stringify({
  title: { value: 'Whole 2bed apartment near QUT', confidence: 'high' },
  description: { value: 'Fully furnished apartment, washer dryer, balcony.', confidence: 'high' },
  rentPerWeek: { value: '520', confidence: 'high' },
  bedrooms: { value: '2', confidence: 'high' },
  bathrooms: { value: '1', confidence: 'high' },
  features: { value: ['Washing machine', 'Dryer', 'Balcony'], confidence: 'high' },
  suburb: { value: 'Kelvin Grove', confidence: 'high' },
  state: { value: 'QLD', confidence: 'high' },
  accommodationHint: { value: 'reads like a whole apartment', confidence: 'high' },
})

const NEAR_EMPTY = JSON.stringify({
  title: { value: 'Room', confidence: 'low' },
  description: null,
  rentPerWeek: null,
  bedrooms: null,
  bondWeeks: { value: '2', confidence: 'high' },
})

describe('parseExtractedListing', () => {
  it('parses a messy Facebook-style payload with confidence and strips tier/bond', () => {
    const meta = parseExtractedListingWithMeta(FACEBOOK_MESSY)
    expect(meta).not.toBeNull()
    expect(meta!.extracted.title?.value).toContain('UNSW')
    expect(meta!.extracted.title?.confidence).toBe('high')
    expect(meta!.extracted.rentPerWeek?.value).toBe('280')
    expect(meta!.extracted.features?.value).toEqual(['WiFi', 'Parking', 'Bills included'])
    expect(meta!.unmatchedFeatureNames).toContain('Netflix')
    // Forbidden keys must not appear on ExtractedListing
    expect(meta!.extracted).not.toHaveProperty('propertyListingType')
    expect(meta!.extracted).not.toHaveProperty('bondWeeks')
    expect(meta!.extracted).not.toHaveProperty('roomType')
  })

  it('parses a Flatmates-style ad including lease and availableFrom', () => {
    const extracted = parseExtractedListing(FLATMATES_AD)
    expect(extracted?.leaseLength?.value).toBe('6 months')
    expect(extracted?.availableFrom?.value).toBe('2026-08-15')
    expect(extracted?.features?.value).toEqual(['WiFi', 'Study desk'])
    expect(extracted?.maxOccupants?.value).toBe('1')
  })

  it('parses a Gumtree-style whole-place ad and leaves unstated fields null', () => {
    const extracted = parseExtractedListing(GUMTREE_AD)
    expect(extracted?.suburb?.value).toBe('Kelvin Grove')
    expect(extracted?.availableFrom).toBeNull()
    expect(extracted?.maxOccupants).toBeNull()
    expect(extracted?.linenSupplied).toBeNull()
    expect(extracted?.parkingSurchargePerWeek).toBeUndefined()
  })

  it('handles a near-empty blurb without inventing rent/bond', () => {
    const extracted = parseExtractedListing(NEAR_EMPTY)
    expect(extracted?.title?.value).toBe('Room')
    expect(extracted?.rentPerWeek).toBeNull()
    expect(extracted).not.toHaveProperty('bondWeeks')
  })
})

describe('applyExtractedListingToDraft', () => {
  it('leaves accommodation unset, uses DEFAULT bond weeks, maps feature names to IDs', () => {
    const extracted = parseExtractedListing(FACEBOOK_MESSY)!
    const { draft, unmatchedFeatures } = applyExtractedListingToDraft(
      extracted,
      CATALOG,
      null,
      ['Netflix'],
    )
    expect(draft.propertyListingType).toBeNull()
    expect(draft.roomType).toBe('')
    expect(draft.bondWeeks).toBe(String(DEFAULT_BOND_WEEKS))
    expect(draft.rentPerWeek).toBe('280')
    expect(draft.selectedFeatureIds).toEqual(['f-wifi', 'f-park', 'f-bills'])
    expect(unmatchedFeatures).toContain('Netflix')
    expect(draft.extractorMeta?.initiated).toBe(true)
    expect(draft.coupleSurchargePerWeek).toBe('')
  })

  it('emptyExtractorDraftBase does not default to entire_property or bond 4', () => {
    const d = emptyExtractorDraftBase()
    expect(d.propertyListingType).toBeNull()
    expect(d.bondWeeks).toBe('2')
  })
})

describe('resolveFeatureNamesToIds', () => {
  it('matches case-insensitively and surfaces unmatched', () => {
    const r = resolveFeatureNamesToIds(['wifi', 'Hot tub', 'Parking'], CATALOG)
    expect(r.matchedIds).toEqual(['f-wifi', 'f-park'])
    expect(r.unmatchedNames).toEqual(['Hot tub'])
  })
})
