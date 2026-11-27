import { describe, expect, it } from 'vitest'
import {
  vicRoomingApplyBlock,
  vicRoomingMoveInPackGap,
  vicRoomingUnsharedRentAcceptBlock,
  vicRoomingUnsharedWeeklyRentError,
  VIC_ROOMING_MOVE_IN_FILES,
  VIC_ROOMING_RESIDENT_NOTICE_TO_LEAVE,
  vicRoomingPayMethodsPublishError,
  vicRoomingPaymentDetailsLine,
  vicRoomingPublishErrors,
  vicRoomingRentInAdvanceError,
  vicRoomingRouting,
} from './vicRoomingHouse.js'

const pay = {
  directDebit: false,
  bankDeposit: false,
  cash: false,
  cheque: false,
  bpay: false,
  otherEft: false,
}

describe('vicRoomingRouting', () => {
  it('sends an off-site room of four or more to the rooming agreement without a registration flag', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
        premisesOccupantCapacity: 4,
      }).kind,
    ).toBe('rooming')
  })

  it('sends a shared room of four or more to the rooming agreement', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'shared_room',
        premisesOccupantCapacity: 4,
      }).kind,
    ).toBe('rooming')
  })

  it('keeps an entire place on Form 1 with no self-contained apartment exception', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'entire_property',
        premisesOccupantCapacity: 8,
        isRegisteredRoomingHouse: true,
      }).kind,
    ).toBe('form1')
  })

  it('does not default an unanswered off-site room to Form 1', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'private_room_landlord_off_site',
        premisesOccupantCapacity: null,
      }).kind,
    ).toBe('unsupported')
  })

  it('blocks a registered rooming house card when the building holds fewer than 4', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'shared_room',
        isRegisteredRoomingHouse: true,
        premisesOccupantCapacity: 3,
      }),
    ).toEqual({
      kind: 'unsupported',
      reason: expect.stringContaining('4 or more'),
    })
  })

  it('keeps a private room under 4 on Form 1 when the rooming house card is not selected', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
        premisesOccupantCapacity: 3,
      }).kind,
    ).toBe('form1')
  })

  it('leaves an on-site room on the licence', () => {
    expect(
      vicRoomingRouting({
        propertyType: 'private_room_landlord_on_site',
        premisesOccupantCapacity: 6,
      }).kind,
    ).toBe('licence')
  })
})

describe('vic rooming publish and booking gates', () => {
  it('rejects cash only, cheque only, and direct debit only', () => {
    expect(vicRoomingPayMethodsPublishError({ ...pay, cash: true })).toBeTruthy()
    expect(vicRoomingPayMethodsPublishError({ ...pay, cheque: true })).toBeTruthy()
    expect(vicRoomingPayMethodsPublishError({ ...pay, directDebit: true })).toBeTruthy()
    expect(vicRoomingPayMethodsPublishError({ ...pay, bankDeposit: true })).toBeNull()
  })

  it('prints bank details only when bank deposit is ticked', () => {
    const bank = { accountName: 'Ada Operator', bsb: '123-456', accountNumber: '998877' }
    expect(vicRoomingPaymentDetailsLine({ ...pay, bpay: true }, bank)).toBe('')
    expect(vicRoomingPaymentDetailsLine({ ...pay, otherEft: true }, bank)).toBe('')
    expect(vicRoomingPaymentDetailsLine({ ...pay, bankDeposit: true }, bank)).toContain('998877')
  })

  it('blocks accept only when a move-in document is missing', () => {
    const present = new Set(VIC_ROOMING_MOVE_IN_FILES.map((file) => file.path))
    expect(vicRoomingMoveInPackGap((path) => present.has(path)).ok).toBe(true)
    present.delete(VIC_ROOMING_MOVE_IN_FILES[0].path)
    const blocked = vicRoomingMoveInPackGap((path) => present.has(path))
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.message).toMatch(/stay published/)
    expect(blocked.message).toMatch(/statement of rights and duties/)
  })

  it('cites 14 days notice for this fixed-term package', () => {
    expect(VIC_ROOMING_RESIDENT_NOTICE_TO_LEAVE).toMatch(/14 days/)
    expect(VIC_ROOMING_RESIDENT_NOTICE_TO_LEAVE).toMatch(/statement of rights and duties/)
    expect(VIC_ROOMING_RESIDENT_NOTICE_TO_LEAVE).toMatch(/2 days/)
  })

  it('blocks a flexible term and more than two residents', () => {
    expect(vicRoomingApplyBlock({ leaseLength: 'Flexible', endDate: null, occupantCount: 1 }).ok).toBe(false)
    expect(vicRoomingApplyBlock({ leaseLength: '6 months', endDate: '2027-01-01', occupantCount: 3 }).ok).toBe(false)
    expect(vicRoomingApplyBlock({ leaseLength: '6 months', endDate: '2027-01-01', occupantCount: 2 }).ok).toBe(true)
  })

  it('refuses rent asked more than 14 days ahead', () => {
    expect(vicRoomingRentInAdvanceError({ weeklyRent: 400, amountDueOnOrBeforeMoveIn: 400 })).toBeNull()
    expect(vicRoomingRentInAdvanceError({ weeklyRent: 400, amountDueOnOrBeforeMoveIn: 1200 })).toBeTruthy()
  })

  it('requires the operator attestation and a yes to electronic service', () => {
    const err = vicRoomingPublishErrors({
      capacity: 4,
      registrationNumber: 'R1',
      operatorLicenceNumber: 'L1',
      operatorAcceptsElectronicService: false,
      houseRules: 'Quiet after 10.',
      roomNumber: '4',
      pay: { ...pay, bankDeposit: true },
      attestationCurrent: true,
      propertyType: 'private_room_landlord_off_site',
      sharedWeeklyRent: 300,
      unsharedWeeklyRent: null,
    })
    expect(err).toMatch(/electronic service/)
  })

  it('requires a higher unshared weekly rent only for a shared room', () => {
    expect(
      vicRoomingUnsharedWeeklyRentError({
        propertyType: 'private_room_landlord_off_site',
        sharedWeeklyRent: 300,
        unsharedWeeklyRent: null,
        required: true,
      }),
    ).toBeNull()
    expect(
      vicRoomingPublishErrors({
        capacity: 4,
        registrationNumber: 'R1',
        operatorLicenceNumber: 'L1',
        operatorAcceptsElectronicService: true,
        houseRules: 'Quiet after 10.',
        roomNumber: '4',
        pay: { ...pay, bankDeposit: true },
        attestationCurrent: true,
        propertyType: 'shared_room',
        sharedWeeklyRent: 300,
        unsharedWeeklyRent: null,
      }),
    ).toMatch(/if it were not shared/)
    expect(
      vicRoomingUnsharedWeeklyRentError({
        propertyType: 'shared_room',
        sharedWeeklyRent: 300,
        unsharedWeeklyRent: 300,
        required: true,
      }),
    ).toMatch(/higher than the shared weekly rent/)
    expect(
      vicRoomingUnsharedWeeklyRentError({
        propertyType: 'shared_room',
        sharedWeeklyRent: 300,
        unsharedWeeklyRent: 450,
        required: true,
      }),
    ).toBeNull()
    expect(vicRoomingUnsharedRentAcceptBlock({ propertyType: 'shared_room', unsharedWeeklyRent: null }).ok).toBe(false)
    expect(vicRoomingUnsharedRentAcceptBlock({ propertyType: 'shared_room', unsharedWeeklyRent: 450 }).ok).toBe(true)
  })
})
