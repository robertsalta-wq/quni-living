import { describe, expect, it } from 'vitest'

import { resolveTenancyPackage } from '../resolveTenancyPackage.js'
import {
  listingBondPaymentEmailHtmlForLandlord,
  listingBondPaymentEmailHtmlForTenant,
} from './listingBondPaymentCopy.js'

const NSW_T2_BOND_RULES = resolveTenancyPackage({
  state: 'NSW',
  property_type: 'private_room_landlord_off_site',
  is_registered_rooming_house: false,
}).rules.bond

describe('listingBondPaymentEmailHtml', () => {
  it('returns no-bond tenant copy when resolved bond is null or zero', () => {
    const htmlNull = listingBondPaymentEmailHtmlForTenant(NSW_T2_BOND_RULES, 'NSW', null)
    const htmlZero = listingBondPaymentEmailHtmlForTenant(NSW_T2_BOND_RULES, 'NSW', 0)
    expect(htmlNull).toContain('No bond is required')
    expect(htmlZero).toContain('No bond is required')
    expect(htmlNull).not.toContain('Pay through')
    expect(htmlNull).not.toContain('Pay your host directly')
  })

  it('returns bond payment steps when resolved bond is positive', () => {
    const html = listingBondPaymentEmailHtmlForTenant(NSW_T2_BOND_RULES, 'NSW', 1600)
    expect(html).toContain('Bond - your choice')
    expect(html).toContain('Pay through')
  })

  it('returns no-bond landlord copy when resolved bond is null or zero', () => {
    const htmlNull = listingBondPaymentEmailHtmlForLandlord(NSW_T2_BOND_RULES, 'NSW', null)
    const htmlZero = listingBondPaymentEmailHtmlForLandlord(NSW_T2_BOND_RULES, 'NSW', 0)
    expect(htmlNull).toContain('No bond is required')
    expect(htmlZero).toContain('do not need to collect or lodge')
    expect(htmlNull).not.toContain('your legal obligations')
  })

  it('returns landlord obligations when resolved bond is positive', () => {
    const html = listingBondPaymentEmailHtmlForLandlord(NSW_T2_BOND_RULES, 'NSW', 1600)
    expect(html).toContain('Bond - your legal obligations')
  })
})
