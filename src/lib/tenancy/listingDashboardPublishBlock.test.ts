import { describe, expect, it } from 'vitest'
import {
  listingDashboardPublishFieldBlock,
  listingNeedsVicRoomingAttestation,
  VIC_LISTING_CAPACITY_PUBLISH_MESSAGE,
  VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY,
  vicRoomingOperatorAttestationIsCurrent,
  type ListingDashboardPublishFields,
} from './listingDashboardPublishBlock'

const noPay = {
  directDebit: false,
  bankDeposit: false,
  cash: false,
  cheque: false,
  bpay: false,
  otherEft: false,
}

function fields(patch: Partial<ListingDashboardPublishFields>): ListingDashboardPublishFields {
  return {
    state: 'NSW',
    propertyType: 'entire_property',
    isRegisteredRoomingHouse: false,
    sharedAreas: {},
    additionalCharges: [],
    roomDescription: '',
    capacity: null,
    registrationNumber: '',
    operatorLicenceNumber: '',
    operatorAcceptsElectronicService: false,
    houseRules: '',
    sharedWeeklyRent: null,
    unsharedWeeklyRent: null,
    pay: noPay,
    attestationCurrent: false,
    ...patch,
  }
}

describe('listingDashboardPublishFieldBlock', () => {
  it('blocks an NSW boarding house with no shared area', () => {
    const message = listingDashboardPublishFieldBlock(
      fields({
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: true,
        roomDescription: 'Room 2',
        sharedAreas: {},
      }),
    )
    expect(message).toBe(
      'Select at least one shared area (kitchen, bathroom, common room, laundry, or other).',
    )
  })

  it('allows an NSW boarding house once a shared area is selected and charges are empty', () => {
    expect(
      listingDashboardPublishFieldBlock(
        fields({
          propertyType: 'private_room_landlord_off_site',
          isRegisteredRoomingHouse: true,
          roomDescription: 'Room 2',
          sharedAreas: { kitchen: true },
          additionalCharges: [],
        }),
      ),
    ).toBeNull()
  })

  it('blocks an incomplete Annexure 2 row', () => {
    expect(
      listingDashboardPublishFieldBlock(
        fields({
          propertyType: 'private_room_landlord_off_site',
          isRegisteredRoomingHouse: true,
          roomDescription: 'Room 2',
          sharedAreas: { kitchen: true },
          additionalCharges: [{ item: 'Internet', amount: '', whenDue: '', howCalculated: '' }],
        }),
      ),
    ).toMatch(/additional charge/)
  })

  it('blocks a Victorian rooming house that is missing the form requirements', () => {
    const row = fields({
      state: 'VIC',
      propertyType: 'private_room_landlord_off_site',
      capacity: 4,
      roomDescription: '',
      pay: { ...noPay, bankDeposit: true },
    })
    expect(listingNeedsVicRoomingAttestation(row)).toBe(true)
    expect(listingDashboardPublishFieldBlock(row)).toBe(
      'Enter the council registration number and the rooming house operator licence number.',
    )
  })

  it('blocks every Victorian publish that has no building capacity', () => {
    expect(
      listingDashboardPublishFieldBlock(
        fields({
          state: 'VIC',
          propertyType: 'entire_property',
          capacity: null,
        }),
      ),
    ).toBe(VIC_LISTING_CAPACITY_PUBLISH_MESSAGE)
  })

  it('lets a complete Victorian rooming house through when the attestation matches', () => {
    const row = fields({
      state: 'VIC',
      propertyType: 'shared_room',
      capacity: 6,
      registrationNumber: 'RH-1',
      operatorLicenceNumber: 'LIC-9',
      operatorAcceptsElectronicService: true,
      houseRules: 'Quiet after 10.',
      roomDescription: 'Room 4',
      sharedWeeklyRent: 300,
      unsharedWeeklyRent: 450,
      pay: { ...noPay, bankDeposit: true },
      attestationCurrent: true,
    })
    expect(listingDashboardPublishFieldBlock(row)).toBeNull()
    expect(
      vicRoomingOperatorAttestationIsCurrent(
        {
          registration_number: 'RH-1',
          operator_licence_number: 'LIC-9',
          registration_current_declared: true,
          licence_current_declared: true,
          warranty_version: VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY,
          superseded_at: null,
        },
        'RH-1',
        'LIC-9',
      ),
    ).toBe(true)
  })
})
