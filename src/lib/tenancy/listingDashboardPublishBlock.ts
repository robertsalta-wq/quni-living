import {
  parseVicPremisesOccupantCapacity,
  vicRoomingPublishErrors,
  vicRoomingRouting,
  type VicRoomingPayMethods,
} from '../../../api/lib/tenancy/vicRoomingHouse'
import { isNswT3ListingFields } from './nswT3ComplianceAttestation'
import {
  nswT3AdditionalChargesError,
  nswT3RoomDescriptionError,
  nswT3SharedAreasError,
  parseNswT3AdditionalCharges,
  parseNswT3SharedAreas,
} from './nswT3ListingFields'

/** Same copy the listing form shows when a Victorian publish has no building capacity. */
export const VIC_LISTING_CAPACITY_PUBLISH_MESSAGE =
  'Enter how many people the building can hold before publishing.'

export const VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY = 'vic-rooming-operator-attestation-v1'

export function vicRoomingOperatorAttestationIsCurrent(
  row: {
    registration_number: string
    operator_licence_number: string
    registration_current_declared: boolean
    licence_current_declared: boolean
    warranty_version: string
    superseded_at: string | null
  } | null,
  registrationNumber: unknown,
  operatorLicenceNumber: unknown,
): boolean {
  if (!row || row.superseded_at) return false
  if (!row.registration_current_declared || !row.licence_current_declared) return false
  if (row.warranty_version !== VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY) return false
  return (
    row.registration_number.trim() === String(registrationNumber || '').trim() &&
    row.operator_licence_number.trim() === String(operatorLicenceNumber || '').trim()
  )
}

export type ListingDashboardPublishFields = {
  state: string | null
  propertyType: string | null
  isRegisteredRoomingHouse: boolean | null
  sharedAreas: unknown
  additionalCharges: unknown
  roomDescription: string | null
  capacity: unknown
  registrationNumber: unknown
  operatorLicenceNumber: unknown
  operatorAcceptsElectronicService: unknown
  houseRules: unknown
  sharedWeeklyRent: unknown
  unsharedWeeklyRent: unknown
  pay: VicRoomingPayMethods
  /** True when a current operator attestation matches the registration and licence on the listing. */
  attestationCurrent: boolean
}

/** Victorian rooming path, once capacity is present. The form only then requires the rooming answers. */
export function listingNeedsVicRoomingAttestation(fields: ListingDashboardPublishFields): boolean {
  if ((fields.state ?? '').trim().toUpperCase() !== 'VIC') return false
  if (parseVicPremisesOccupantCapacity(fields.capacity) == null) return false
  return (
    vicRoomingRouting({
      propertyType: fields.propertyType,
      isRegisteredRoomingHouse: fields.isRegisteredRoomingHouse,
      premisesOccupantCapacity: fields.capacity,
    }).kind === 'rooming'
  )
}

/**
 * Field checks the listing form runs before a draft can go live.
 * NSW T3 also needs the compliance attestation, which the caller checks separately.
 */
export function listingDashboardPublishFieldBlock(fields: ListingDashboardPublishFields): string | null {
  if (
    isNswT3ListingFields({
      state: fields.state,
      propertyType: fields.propertyType,
      isRegisteredRoomingHouse: fields.isRegisteredRoomingHouse,
    })
  ) {
    const roomErr = nswT3RoomDescriptionError(fields.roomDescription ?? '')
    if (roomErr) return roomErr
    const sharedErr = nswT3SharedAreasError(parseNswT3SharedAreas(fields.sharedAreas))
    if (sharedErr) return sharedErr
    const chargeErr = nswT3AdditionalChargesError(parseNswT3AdditionalCharges(fields.additionalCharges))
    if (chargeErr) return chargeErr
  }

  if ((fields.state ?? '').trim().toUpperCase() !== 'VIC') return null

  if (parseVicPremisesOccupantCapacity(fields.capacity) == null) {
    return VIC_LISTING_CAPACITY_PUBLISH_MESSAGE
  }
  const route = vicRoomingRouting({
    propertyType: fields.propertyType,
    isRegisteredRoomingHouse: fields.isRegisteredRoomingHouse,
    premisesOccupantCapacity: fields.capacity,
  })
  if (route.kind === 'unsupported') return route.reason
  if (route.kind !== 'rooming') return null
  return vicRoomingPublishErrors({
    capacity: fields.capacity,
    registrationNumber: fields.registrationNumber,
    operatorLicenceNumber: fields.operatorLicenceNumber,
    operatorAcceptsElectronicService: fields.operatorAcceptsElectronicService,
    houseRules: fields.houseRules,
    roomNumber: fields.roomDescription,
    pay: fields.pay,
    attestationCurrent: fields.attestationCurrent,
    propertyType: fields.propertyType,
    sharedWeeklyRent: fields.sharedWeeklyRent,
    unsharedWeeklyRent: fields.unsharedWeeklyRent,
  })
}
