import { describe, expect, it } from 'vitest'
import {
  isBoardingLodgerBondContext,
  isBondPaymentReceiptContext,
  isLandlordHeldBondContext,
} from './listings'

describe('bond receipt gates', () => {
  const onSite = 'private_room_landlord_on_site'

  it('VIC T1 boarding: landlord-held statutory context (schemeApplies false in vic.ts)', () => {
    expect(isLandlordHeldBondContext(onSite, 'VIC')).toBe(true)
  })

  it('QLD boarding: payment receipt eligible, not landlord-held statutory context', () => {
    expect(isBondPaymentReceiptContext(onSite)).toBe(true)
    expect(isBoardingLodgerBondContext(onSite)).toBe(true)
    expect(isLandlordHeldBondContext(onSite, 'QLD')).toBe(false)
  })

  it('NSW boarding: both payment receipt and landlord-held context', () => {
    expect(isBondPaymentReceiptContext(onSite)).toBe(true)
    expect(isLandlordHeldBondContext(onSite, 'NSW')).toBe(true)
  })

  it('returns false for non-boarding types regardless of state', () => {
    expect(isBondPaymentReceiptContext('private_room')).toBe(false)
    expect(isLandlordHeldBondContext('private_room', 'NSW')).toBe(false)
  })
})
