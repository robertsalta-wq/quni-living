/**
 * Apply extraction JSON onto landlord_property_draft (localStorage only).
 * Never sets propertyListingType / roomType / bondWeeks / surcharges / state-gated fields.
 */
import { DEFAULT_BOND_WEEKS } from '../booking/resolveBookingBondAmount'
import {
  emptyDraftBase,
  LANDLORD_PROPERTY_DRAFT_KEY,
  LANDLORD_PROPERTY_DRAFT_VERSION,
  readLandlordPropertyDraftRaw,
  type LandlordPropertyDraftRecord,
} from '../listingHubDraft'
import type { FeatureRowPick } from './featureNameResolve'
import { resolveFeatureNamesToIds } from './featureNameResolve'
import type { ExtractedListing, ListingExtractorConfidenceMap, ListingExtractorDraftMeta } from './types'

export type ApplyExtractedListingResult = {
  draft: LandlordPropertyDraftRecord
  unmatchedFeatures: string[]
  confidence: ListingExtractorConfidenceMap
}

function takeString(
  field: ExtractedListing[keyof ExtractedListing],
  confidence: ListingExtractorConfidenceMap,
  key: keyof ListingExtractorConfidenceMap,
): string | undefined {
  if (!field || typeof field !== 'object' || !('value' in field)) return undefined
  const v = (field as { value: unknown; confidence: 'high' | 'low' }).value
  if (typeof v !== 'string') return undefined
  confidence[key] = field.confidence
  return v
}

function takeBoolean(
  field: ExtractedListing['furnished'],
  confidence: ListingExtractorConfidenceMap,
  key: keyof ListingExtractorConfidenceMap,
): boolean | undefined {
  if (!field) return undefined
  confidence[key] = field.confidence
  return field.value
}

/**
 * Build an extractor-initiated draft: accommodation unset, bond left to form default.
 */
export function emptyExtractorDraftBase(): LandlordPropertyDraftRecord {
  const base = emptyDraftBase()
  return {
    ...base,
    propertyListingType: null,
    roomType: '',
    // Form/API default — do not invent bond weeks from paste
    bondWeeks: String(DEFAULT_BOND_WEEKS),
    extractorMeta: {
      initiated: true,
      confidence: {},
      accommodationHint: null,
      unmatchedFeatures: [],
    } satisfies ListingExtractorDraftMeta,
  }
}

export function applyExtractedListingToDraft(
  extracted: ExtractedListing,
  featuresCatalog: FeatureRowPick[],
  existing?: LandlordPropertyDraftRecord | null,
  extraUnmatchedFeatures: string[] = [],
): ApplyExtractedListingResult {
  const confidence: ListingExtractorConfidenceMap = {}
  const base: LandlordPropertyDraftRecord = existing
    ? { ...existing, v: LANDLORD_PROPERTY_DRAFT_VERSION }
    : emptyExtractorDraftBase()

  // Always force unset tier for extractor path (guardrail 4)
  base.propertyListingType = null
  base.roomType = ''
  // Never carry a guessed bond — keep form default (also fixes legacy hub '4')
  base.bondWeeks = String(DEFAULT_BOND_WEEKS)
  // Never invent surcharges from paste
  base.coupleSurchargePerWeek =
    typeof base.coupleSurchargePerWeek === 'string' ? base.coupleSurchargePerWeek : ''
  // Do not touch state-gated utilities / FT6600 — leave whatever was there, extractor never sets them

  const title = takeString(extracted.title, confidence, 'title')
  if (title != null) base.title = title

  const description = takeString(extracted.description, confidence, 'description')
  if (description != null) base.description = description

  const rentPerWeek = takeString(extracted.rentPerWeek, confidence, 'rentPerWeek')
  if (rentPerWeek != null) base.rentPerWeek = rentPerWeek

  const bedrooms = takeString(extracted.bedrooms, confidence, 'bedrooms')
  if (bedrooms != null) base.bedrooms = bedrooms

  const bathrooms = takeString(extracted.bathrooms, confidence, 'bathrooms')
  if (bathrooms != null) base.bathrooms = bathrooms

  const maxOccupants = takeString(extracted.maxOccupants, confidence, 'maxOccupants')
  if (maxOccupants != null) base.maxOccupants = maxOccupants

  const furnished = takeBoolean(extracted.furnished, confidence, 'furnished')
  if (furnished != null) base.furnished = furnished

  const linenSupplied = takeBoolean(extracted.linenSupplied, confidence, 'linenSupplied')
  if (linenSupplied != null) base.linenSupplied = linenSupplied

  const weeklyCleaning = takeBoolean(extracted.weeklyCleaning, confidence, 'weeklyCleaning')
  if (weeklyCleaning != null) base.weeklyCleaning = weeklyCleaning

  const parkingAvailable = takeBoolean(extracted.parkingAvailable, confidence, 'parkingAvailable')
  if (parkingAvailable != null) base.parkingAvailable = parkingAvailable

  const address = takeString(extracted.address, confidence, 'address')
  if (address != null) base.address = address

  const suburb = takeString(extracted.suburb, confidence, 'suburb')
  if (suburb != null) base.suburb = suburb

  const state = takeString(extracted.state, confidence, 'state')
  if (state != null) base.state = state

  const postcode = takeString(extracted.postcode, confidence, 'postcode')
  if (postcode != null) base.postcode = postcode

  const leaseLength = takeString(extracted.leaseLength, confidence, 'leaseLength')
  if (leaseLength != null) base.leaseLength = leaseLength

  const availableFrom = takeString(extracted.availableFrom, confidence, 'availableFrom')
  if (availableFrom != null) base.availableFrom = availableFrom

  const houseRulesText = takeString(extracted.houseRulesText, confidence, 'houseRulesText')
  if (houseRulesText != null) {
    base.houseRules = houseRulesText
    confidence.houseRules = extracted.houseRulesText!.confidence
  }

  let unmatchedFeatures: string[] = [...extraUnmatchedFeatures]
  if (extracted.features?.value?.length) {
    const resolved = resolveFeatureNamesToIds(extracted.features.value, featuresCatalog)
    base.selectedFeatureIds = resolved.matchedIds
    confidence.features = extracted.features.confidence
    confidence.selectedFeatureIds = extracted.features.confidence
    for (const u of resolved.unmatchedNames) {
      if (!unmatchedFeatures.some((x) => x.toLowerCase() === u.toLowerCase())) unmatchedFeatures.push(u)
    }
    if (resolved.matchedNames.some((n) => n.toLowerCase() === 'parking')) {
      base.parkingAvailable = true
    }
  }

  const accommodationHint = takeString(extracted.accommodationHint, confidence, 'accommodationHint')

  const extractorMeta: ListingExtractorDraftMeta = {
    initiated: true,
    confidence,
    accommodationHint: accommodationHint ?? null,
    unmatchedFeatures,
  }
  base.extractorMeta = extractorMeta

  return { draft: base, unmatchedFeatures, confidence }
}

export function persistExtractorDraft(draft: LandlordPropertyDraftRecord): void {
  try {
    localStorage.setItem(LANDLORD_PROPERTY_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function applyAndPersistExtractedListing(
  extracted: ExtractedListing,
  featuresCatalog: FeatureRowPick[],
  extraUnmatchedFeatures: string[] = [],
): ApplyExtractedListingResult {
  const existing = readLandlordPropertyDraftRaw()
  const result = applyExtractedListingToDraft(
    extracted,
    featuresCatalog,
    existing,
    extraUnmatchedFeatures,
  )
  persistExtractorDraft(result.draft)
  return result
}
