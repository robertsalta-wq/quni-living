/**
 * Accommodation / publish guards for extractor-initiated drafts.
 * Guardrail: never infers tier — propertyListingType must be human-chosen.
 */
import type { PropertyListingType } from '../listings'
import { ACCOMMODATION_UNSET_PUBLISH_MESSAGE } from './types'

export function isAccommodationUnset(
  propertyListingType: PropertyListingType | null | undefined,
): boolean {
  return propertyListingType == null
}

/** True when a new listing must not insert as active yet. */
export function canPublishWithAccommodation(
  propertyListingType: PropertyListingType | null | undefined,
): boolean {
  return !isAccommodationUnset(propertyListingType)
}

export function accommodationUnsetPublishError(
  propertyListingType: PropertyListingType | null | undefined,
): string | null {
  if (canPublishWithAccommodation(propertyListingType)) return null
  return ACCOMMODATION_UNSET_PUBLISH_MESSAGE
}

/**
 * Assert used by tests / submit path: extractor draft must not reach properties.insert
 * while accommodation is unset.
 */
export function assertExtractorDraftMayInsertActive(opts: {
  extractorInitiated: boolean
  propertyListingType: PropertyListingType | null | undefined
}): void {
  if (!opts.extractorInitiated) return
  const err = accommodationUnsetPublishError(opts.propertyListingType)
  if (err) throw new Error(err)
}
