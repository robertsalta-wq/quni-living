import { describe, expect, it } from 'vitest'
import {
  vicRoomingApplyBlock,
  vicRoomingStatementAcceptBlock,
  VIC_ROOMING_S124_ACCEPT_MESSAGE,
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

  it('lets a rooming house listing publish while section 124 is still missing, and blocks accept', () => {
    expect(vicRoomingStatementAcceptBlock()).toEqual({ ok: false, message: VIC_ROOMING_S124_ACCEPT_MESSAGE })
    expect(VIC_ROOMING_S124_ACCEPT_MESSAGE).toMatch(/stay published/)
    expect(VIC_ROOMING_S124_ACCEPT_MESSAGE).toMatch(/section 124/)
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
    })
    expect(err).toMatch(/electronic service/)
  })
})
