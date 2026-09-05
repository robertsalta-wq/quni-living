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
 * Product status while Form R18 is not generated.
 * Not a statement of the legal test.
 */
export const QLD_ROOMING_FORM_R18_NOT_GENERATED_REASON =
  'This arrangement is rooming accommodation under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld). The prescribed form is Form R18. Quni does not generate Form R18 yet.'

export function parseRoomsOccupiedOrAvailableToResidents(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(99, Math.floor(n))
}

/**
 * Pure classifier. Inputs are the three canonical facts.
 * Registration and service level are not inputs.
 */
export function classifyQldArrangement(input: QldClassificationInput): QldLegalOutcome {
  if (input.whatIsLet === 'whole_or_self_contained') return 'general_tenancy'
  if (!input.providerLivesAtPremises) return 'rooming'
  const n = input.roomsOccupiedOrAvailableToResidents
  if (n != null && n > QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS) return 'rooming'
  return 'outside_act'
}

export function qldPropertyTierFromOutcome(outcome: QldLegalOutcome): 't1' | 't2' | 't3' {
  if (outcome === 'outside_act') return 't1'
  if (outcome === 'general_tenancy') return 't2'
  return 't3'
}

/**
 * Stage 1 listing adapter.
 * Entire place → whole or self-contained.
 * Room and shared-bedroom cards → rooms with shared facilities (no facilities field yet).
 * Returns null for unknown property_type.
 */
export function qldFactsFromListing(input: {
  propertyType: string
  roomsRentedToResidents?: unknown
}): QldClassificationInput | null {
  const propertyType = input.propertyType.trim()
  if (propertyType === 'entire_property') {
    return {
      whatIsLet: 'whole_or_self_contained',
      providerLivesAtPremises: false,
      roomsOccupiedOrAvailableToResidents: null,
    }
  }
  if (propertyType === 'private_room_landlord_off_site' || propertyType === 'shared_room') {
    return {
      whatIsLet: 'room_with_shared_facilities',
      providerLivesAtPremises: false,
      roomsOccupiedOrAvailableToResidents: null,
    }
  }
  if (propertyType === 'private_room_landlord_on_site') {
    return {
      whatIsLet: 'room_with_shared_facilities',
      providerLivesAtPremises: true,
      roomsOccupiedOrAvailableToResidents: parseRoomsOccupiedOrAvailableToResidents(
        input.roomsRentedToResidents,
      ),
    }
  }
  return null
}
