/**
 * Queensland legal classification.
 * Prose source of truth: docs/legal/qld-classification-rule.md
 * Do not paraphrase the test here. Cite that file.
 */

export type QldLegalOutcome = 'general_tenancy' | 'rooming' | 'outside_act'

export type QldWhatIsLet = 'whole_or_self_contained' | 'room_with_shared_facilities'

export type QldClassificationInput = {
  whatIsLet: QldWhatIsLet
  providerLivesAtPremises: boolean
  /** Rooms occupied by or available to residents. Used only in the live-in branch. Null means unknown. */
  roomsOccupiedOrAvailableToResidents: number | null
}

/** s 43 live-in ceiling. One number; cite the canonical rule, do not restate the test. */
export const QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS = 3

/**
 * Kept for isQldRoomingFormR18Pending. Stage 6 sets QLD T3 supported, so this
 * string is not returned as unsupportedReason on the live path.
 */
export const QLD_ROOMING_FORM_R18_NOT_GENERATED_REASON =
  'This arrangement is rooming accommodation under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld). The prescribed form is Form R18.'

export const QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON =
  'Say whether the renter shares a kitchen or bathroom with anyone else.'

export const QLD_ROOMS_RENTED_UNANSWERED_REASON =
  'Enter how many rooms are occupied by or available to residents in this home, not including the room you sleep in.'

export type QldClassifyResult = QldLegalOutcome | 'needs_room_count'

export type QldFactsFromListingResult =
  | { status: 'classified'; facts: QldClassificationInput }
  | { status: 'unanswered'; unsupportedReason: string }
  | { status: 'unknown_property_type' }

export function parseRoomsOccupiedOrAvailableToResidents(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(99, Math.floor(n))
}

/**
 * Pure classifier. Inputs are the three canonical facts.
 * Registration and service level are not inputs.
 * Unknown live-in room count is not a legal outcome: callers must not guess.
 */
export function classifyQldArrangement(input: QldClassificationInput): QldClassifyResult {
  if (input.whatIsLet === 'whole_or_self_contained') return 'general_tenancy'
  if (!input.providerLivesAtPremises) return 'rooming'
  const n = input.roomsOccupiedOrAvailableToResidents
  if (n == null) return 'needs_room_count'
  if (n > QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS) return 'rooming'
  return 'outside_act'
}

export function qldPropertyTierFromOutcome(outcome: QldLegalOutcome): 't1' | 't2' | 't3' {
  if (outcome === 'outside_act') return 't1'
  if (outcome === 'general_tenancy') return 't2'
  return 't3'
}

export function parseQldSharesKitchenOrBathroom(raw: unknown): boolean | null {
  if (raw === true || raw === 'yes' || raw === 'true') return true
  if (raw === false || raw === 'no' || raw === 'false') return false
  return null
}

function isQldRoomCardPropertyType(propertyType: string): boolean {
  return (
    propertyType === 'private_room_landlord_on_site' ||
    propertyType === 'private_room_landlord_off_site' ||
    propertyType === 'shared_room'
  )
}

/**
 * Listing adapter.
 * Entire place → whole or self-contained. Kitchen/bath and room count are not inputs.
 * Room and shared-bedroom cards: unanswered kitchen/bath is unsupported, not a default.
 * Explicit "does not share" → whole or self-contained.
 * Explicit share → rooms with shared facilities. Live-in then needs the room count; unknown count is unsupported.
 * The listing form requires an explicit yes/no; it does not pre-tick either answer.
 */
export function qldFactsFromListing(input: {
  propertyType: string
  roomsRentedToResidents?: unknown
  sharesKitchenOrBathroom?: unknown
}): QldFactsFromListingResult {
  const propertyType = input.propertyType.trim()
  if (propertyType === 'entire_property') {
    return {
      status: 'classified',
      facts: {
        whatIsLet: 'whole_or_self_contained',
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: null,
      },
    }
  }
  if (!isQldRoomCardPropertyType(propertyType)) {
    return { status: 'unknown_property_type' }
  }

  const shares = parseQldSharesKitchenOrBathroom(input.sharesKitchenOrBathroom)
  if (shares === null) {
    return { status: 'unanswered', unsupportedReason: QLD_SHARES_KITCHEN_OR_BATHROOM_UNANSWERED_REASON }
  }

  const whatIsLet: QldWhatIsLet =
    shares === false ? 'whole_or_self_contained' : 'room_with_shared_facilities'

  if (propertyType === 'private_room_landlord_off_site' || propertyType === 'shared_room') {
    return {
      status: 'classified',
      facts: {
        whatIsLet,
        providerLivesAtPremises: false,
        roomsOccupiedOrAvailableToResidents: null,
      },
    }
  }

  const roomsOccupiedOrAvailableToResidents = parseRoomsOccupiedOrAvailableToResidents(
    input.roomsRentedToResidents,
  )
  if (whatIsLet === 'room_with_shared_facilities' && roomsOccupiedOrAvailableToResidents == null) {
    return { status: 'unanswered', unsupportedReason: QLD_ROOMS_RENTED_UNANSWERED_REASON }
  }

  return {
    status: 'classified',
    facts: {
      whatIsLet,
      providerLivesAtPremises: true,
      roomsOccupiedOrAvailableToResidents,
    },
  }
}
