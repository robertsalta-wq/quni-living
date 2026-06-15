import { describe, expect, it } from 'vitest'
import { isBoardingLodgerBondContext, isLandlordHeldBondContext } from './listings'

describe('isLandlordHeldBondContext', () => {
  const onSite = 'private_room_landlord_on_site'

  it('matches boarding/lodger gate for NSW (unchanged from pre-QLD fix)', () => {
    expect(isBoardingLodgerBondContext(onSite)).toBe(true)
    expect(isLandlordHeldBondContext(onSite, 'NSW')).toBe(true)
  })

  it('matches boarding/lodger gate for VIC (unchanged from pre-QLD fix)', () => {
    expect(isLandlordHeldBondContext(onSite, 'VIC')).toBe(true)
  })

  it('excludes QLD on-site (RTA scheme — only intentional delta)', () => {
    expect(isBoardingLodgerBondContext(onSite)).toBe(true)
    expect(isLandlordHeldBondContext(onSite, 'QLD')).toBe(false)
  })

  it('returns false for non-boarding types regardless of state', () => {
    expect(isLandlordHeldBondContext('private_room', 'NSW')).toBe(false)
    expect(isLandlordHeldBondContext('private_room', 'VIC')).toBe(false)
    expect(isLandlordHeldBondContext('private_room', 'QLD')).toBe(false)
  })
})
