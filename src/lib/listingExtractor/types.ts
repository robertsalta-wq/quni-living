/** Paste-to-list extractor schema (form / localStorage only — never DB). */

export type ExtractConfidence = 'high' | 'low'

export type ExtractedField<T> = {
  value: T
  confidence: ExtractConfidence
} | null

/** Feature names the model may return (must match seeded `features.name`). */
export const EXTRACTOR_FEATURE_NAMES = [
  'WiFi',
  'Air conditioning',
  'Heating',
  'Washing machine',
  'Dryer',
  'Dishwasher',
  'Parking',
  'Gym access',
  'Swimming pool',
  'Balcony',
  'Garden',
  'Pet friendly',
  'Bills included',
  'Study desk',
  'Near public transport',
] as const

export type ExtractorFeatureName = (typeof EXTRACTOR_FEATURE_NAMES)[number]

export const EXTRACTOR_LEASE_LENGTHS = ['Flexible', '6 months', '12 months', '2 years'] as const
export type ExtractorLeaseLength = (typeof EXTRACTOR_LEASE_LENGTHS)[number]

/**
 * Structured extraction result. Every extractable field is `{ value, confidence }` or `null`.
 * Tier / money / state-gated fields are intentionally absent (always left for the human).
 */
export type ExtractedListing = {
  title: ExtractedField<string>
  description: ExtractedField<string>
  rentPerWeek: ExtractedField<string>
  bedrooms: ExtractedField<string>
  bathrooms: ExtractedField<string>
  maxOccupants: ExtractedField<string>
  furnished: ExtractedField<boolean>
  linenSupplied: ExtractedField<boolean>
  weeklyCleaning: ExtractedField<boolean>
  features: ExtractedField<string[]>
  parkingAvailable: ExtractedField<boolean>
  address: ExtractedField<string>
  suburb: ExtractedField<string>
  state: ExtractedField<string>
  postcode: ExtractedField<string>
  leaseLength: ExtractedField<ExtractorLeaseLength>
  availableFrom: ExtractedField<string>
  houseRulesText: ExtractedField<string>
  /** Non-binding nudge only — never sets propertyListingType / roomType. */
  accommodationHint: ExtractedField<string>
}

export type ListingExtractorFieldKey = keyof ExtractedListing

/** Confidence map stored on the draft for reviewable UI. */
export type ListingExtractorConfidenceMap = Partial<
  Record<ListingExtractorFieldKey | 'selectedFeatureIds' | 'houseRules', ExtractConfidence>
>

export type ListingExtractorDraftMeta = {
  initiated: true
  confidence: ListingExtractorConfidenceMap
  accommodationHint: string | null
  unmatchedFeatures: string[]
}

export const ACCOMMODATION_UNSET_PUBLISH_MESSAGE =
  'Choose how this is let before publishing — pick one of the accommodation options under Property details.'

export const HUB_PRIVATE_ROOM_SITE_REQUIRED_MESSAGE =
  'Choose whether you live on site or not — this sets the listing tier and cannot be guessed.'
