import { describe, expect, it } from 'vitest'

import {
  computeServiceTierAtRequestSnapshot,
  resolveEffectiveConfirmTier,
  validateLandlordConfirmTierChoice,
} from './serviceTierSnapshot.js'

describe('serviceTierSnapshot', () => {
  it('computeServiceTierAtRequestSnapshot defaults to managed when both tiers are valid', () => {
    expect(
      computeServiceTierAtRequestSnapshot({
        state: 'QLD',
        propertyType: 'entire_property',
        isRegisteredRoomingHouse: false,
        moduleEnabled: true,
      }),
    ).toBe('managed')
  })

  it('computeServiceTierAtRequestSnapshot uses the property service tier when set', () => {
    expect(
      computeServiceTierAtRequestSnapshot({
        state: 'QLD',
        propertyType: 'entire_property',
        isRegisteredRoomingHouse: false,
        moduleEnabled: true,
        propertyServiceTier: 'listing',
      }),
    ).toBe('listing')
  })

  it('computeServiceTierAtRequestSnapshot uses listing when Managed is not available', () => {
    expect(
      computeServiceTierAtRequestSnapshot({
        state: 'NSW',
        propertyType: 'entire_property',
        isRegisteredRoomingHouse: false,
        moduleEnabled: true,
      }),
    ).toBe('listing')
  })

  it('validateLandlordConfirmTierChoice rejects Listing when module off', () => {
    const err = validateLandlordConfirmTierChoice('listing', {
      moduleEnabled: false,
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
    })
    expect(err?.code).toBe('listing_module_disabled')
  })

  it('resolveEffectiveConfirmTier prefers explicit body tier', () => {
    expect(
      resolveEffectiveConfirmTier({
        bodyServiceTier: 'listing',
        bookingServiceTierAtRequest: 'managed',
        state: 'QLD',
        propertyType: 'entire_property',
        isRegisteredRoomingHouse: false,
        moduleEnabled: true,
      }),
    ).toBe('listing')
  })

  it('validateLandlordConfirmTierChoice rejects Listing for Managed properties', () => {
    const err = validateLandlordConfirmTierChoice('listing', {
      moduleEnabled: true,
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      propertyServiceTier: 'managed',
    })
    expect(err?.code).toBe('tier_not_available')
  })
})
