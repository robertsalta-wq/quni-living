import {
  missingNswFt6600ComplianceFieldLabels,
  nswFt6600ComplianceBlockedMessage,
} from '../../../api/lib/documents/propertyFt6600Compliance.js'
import { roomingHouseFieldErrors } from '../landlordAccommodationChoice'
import { LISTING_ACCURACY_BLOCKED_MESSAGE } from '../listingAccuracyAttestation'
import { isPropertyListingType } from '../listings'
import { featureNamesFromPropertyRow, propertyBillsIncluded } from '../propertyFeatureSignals'
import {
  listingTierRequiresPropertyPayoutDetails,
  propertyPayoutDetailsFieldErrors,
  type PropertyPayoutDetailsInput,
} from '../propertyPayoutDetails'
import {
  landlordPropertyUtilitiesFormStateFromProperty,
} from '../propertyUtilitiesFormState'
import { missingPerServiceUtilitiesFormIssues } from '../propertyUtilitiesFormValidation'
import { WATER_SEPARATELY_METERED_BLOCKED_MESSAGE } from '../waterSeparatelyMeteredAttestation'
import { isQldOnSiteBoarderLodgerListing, qldRoomsRentedFieldError } from './qldBoarderLodger'
import {
  emptyQldNoticeConsentFormState,
  isQldRoomCardListing,
  parseQldYesNo,
  qldRoomDescriptionError,
  qldRoomingListingSaveError,
  qldSharesKitchenOrBathroomError,
  type QldNoticeConsentFormState,
} from './qldRoomingListingFields'
import { isQldRoomingArrangement, resolveTenancyPackage } from './resolveTenancyPackage'

export type ListingGoLiveCompletenessInput = {
  state: string | null
  propertyType: string | null
  isRegisteredRoomingHouse: boolean | null
  serviceTier: string | null
  roomDescription: string | null
  roomsRentedToResidents: number | null
  sharesKitchenOrBathroom: boolean | null
  personsAtPremises: number | null
  maxOccupants: number | null
  rentPaymentMethod2: string | null
  rentPaymentMethod2Costs: string | null
  rentPaymentMethod2FinancialBenefit: string | null
  rentLastIncreasedOn: string | null
  registrationNumber: string | null
  featureNames: string[]
  waterUsageChargedSeparately: boolean | null
  waterAttested: boolean
  accuracyAttested: boolean
  nonDiscriminationAccepted: boolean
  utilitiesServices: unknown
  compliance: Record<string, unknown>
  payee: PropertyPayoutDetailsInput | null
  providerNotice: QldNoticeConsentFormState | null
}

function stateCode(state: string | null): string {
  return (state ?? '').trim().toUpperCase()
}

function qldRoomingFromInput(input: ListingGoLiveCompletenessInput): boolean {
  if (stateCode(input.state) !== 'QLD') return false
  const pkg = resolveTenancyPackage({
    state: 'QLD',
    property_type: input.propertyType ?? '',
    is_registered_rooming_house: false,
    rooms_rented_to_residents: input.roomsRentedToResidents,
    shares_kitchen_or_bathroom: input.sharesKitchenOrBathroom,
  })
  return isQldRoomingArrangement(pkg)
}

/**
 * Completeness the listing form used to enforce on every save.
 * Draft saves skip it. Publish and an already-live save still require it.
 * Victorian rooming and NSW boarding-house particulars stay in listingDashboardPublishFieldBlock.
 */
export function listingGoLiveCompletenessBlock(input: ListingGoLiveCompletenessInput): string | null {
  const state = stateCode(input.state)
  const propertyType = input.propertyType && isPropertyListingType(input.propertyType) ? input.propertyType : null

  if (isQldOnSiteBoarderLodgerListing(state, propertyType)) {
    const roomsErr = qldRoomsRentedFieldError(input.roomsRentedToResidents)
    if (roomsErr) return roomsErr
  }

  if (isQldRoomCardListing(state, propertyType)) {
    const shares = parseQldYesNo(input.sharesKitchenOrBathroom)
    const sharesErr = qldSharesKitchenOrBathroomError(shares)
    if (sharesErr) return sharesErr
    const roomErr = qldRoomDescriptionError(input.roomDescription ?? '')
    if (roomErr) return roomErr
    if (qldRoomingFromInput(input)) {
      const personsInRoom = input.maxOccupants != null && input.maxOccupants > 0 ? input.maxOccupants : 1
      const qldErr = qldRoomingListingSaveError({
        sharesKitchenOrBathroom: shares,
        roomDescription: input.roomDescription ?? '',
        personsAtPremises: input.personsAtPremises != null ? String(input.personsAtPremises) : '',
        personsInRoom,
        form: {
          sharesKitchenOrBathroom: shares,
          studentAccommodation: false,
          personsAtPremises: input.personsAtPremises != null ? String(input.personsAtPremises) : '',
          rentPaymentMethod2: input.rentPaymentMethod2 ?? '',
          rentPaymentMethod2Costs: input.rentPaymentMethod2Costs ?? '',
          rentPaymentMethod2FinancialBenefit: input.rentPaymentMethod2FinancialBenefit ?? '',
          rentLastIncreasedOn: input.rentLastIncreasedOn ?? '',
          providerNotice: input.providerNotice ?? emptyQldNoticeConsentFormState(),
        },
      })
      if (qldErr) return qldErr
    }
  }

  if (propertyType && state !== 'VIC' && input.isRegisteredRoomingHouse) {
    const rooming = roomingHouseFieldErrors(propertyType, true, input.registrationNumber ?? '')
    if (rooming.onSiteConflict) return rooming.onSiteConflict
    if (rooming.missingRegistration) return rooming.missingRegistration
  }

  if (state === 'NSW') {
    const missing = missingNswFt6600ComplianceFieldLabels(input.compliance)
    if (missing.length > 0) return nswFt6600ComplianceBlockedMessage(missing)
  }

  if (state === 'QLD' || state === 'VIC') {
    const billsIncluded = propertyBillsIncluded(input.featureNames)
    if (!billsIncluded) {
      const utilities = landlordPropertyUtilitiesFormStateFromProperty({
        water_usage_charged_separately: input.waterUsageChargedSeparately,
        utilities_services: input.utilitiesServices,
      })
      const issues = missingPerServiceUtilitiesFormIssues(utilities)
      if (issues.length > 0) {
        return `Complete utilities on the property listing before publishing. ${issues.map((issue) => issue.message).join(' ')}`
      }
    }
  }

  if (!input.nonDiscriminationAccepted) {
    return "Please confirm you have read and agree to Quni's Non-Discrimination Policy."
  }

  if (input.waterUsageChargedSeparately === true && !input.waterAttested) {
    return WATER_SEPARATELY_METERED_BLOCKED_MESSAGE
  }

  if (listingTierRequiresPropertyPayoutDetails(input.serviceTier)) {
    const payeeErrs = propertyPayoutDetailsFieldErrors(input.payee ?? {}, {
      requireComplete: true,
      requireBankName: qldRoomingFromInput(input),
    })
    if (payeeErrs.length > 0) return payeeErrs.join(' ')
  }

  if (!input.accuracyAttested) return LISTING_ACCURACY_BLOCKED_MESSAGE

  return null
}

export function featureNamesForGoLive(
  rows: { features?: { name?: string | null } | { name?: string | null }[] | null }[] | null | undefined,
): string[] {
  const propertyFeatures = (rows ?? []).map((row) => ({
    features: Array.isArray(row.features) ? (row.features[0] ?? null) : (row.features ?? null),
  }))
  return featureNamesFromPropertyRow({ property_features: propertyFeatures })
}
