import { describe, expect, it } from 'vitest'
import { landlordAcceptTierUiModel } from './landlordAcceptTierOptions'

describe('landlordAcceptTierUiModel', () => {
  it('QLD + module on: both tiers, default Managed', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
    })
    expect(m.showListing).toBe(true)
    expect(m.showManaged).toBe(true)
    expect(m.defaultTier).toBe('managed')
  })

  it('hides Listing when module is off', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: false,
    })
    expect(m.showListing).toBe(false)
    expect(m.showManaged).toBe(true)
    expect(m.defaultTier).toBe('managed')
  })

  it('NSW Tier 2: Managed gated → Listing only', () => {
    const m = landlordAcceptTierUiModel({
      state: 'NSW',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
    })
    expect(m.showListing).toBe(true)
    expect(m.showManaged).toBe(false)
    expect(m.defaultTier).toBe('listing')
  })

  it('Managed shows Most popular only when both tiers show (caller renders tag)', () => {
    const both = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
    })
    const listingOnly = landlordAcceptTierUiModel({
      state: 'NSW',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
    })
    expect(both.showListing && both.showManaged).toBe(true)
    expect(listingOnly.showListing && listingOnly.showManaged).toBe(false)
  })
})
