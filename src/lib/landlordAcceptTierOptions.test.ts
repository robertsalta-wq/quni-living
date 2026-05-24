import { describe, expect, it } from 'vitest'
import { landlordAcceptTierUiModel } from './landlordAcceptTierOptions'

describe('landlordAcceptTierUiModel', () => {
  it('QLD Listing property: shows Listing with Managed upgrade, default Listing', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
      propertyServiceTier: 'listing',
    })
    expect(m.showListing).toBe(true)
    expect(m.showManaged).toBe(true)
    expect(m.showManagedUpgrade).toBe(true)
    expect(m.defaultTier).toBe('listing')
  })

  it('QLD Managed property: hides Listing and defaults Managed', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
      propertyServiceTier: 'managed',
    })
    expect(m.showListing).toBe(false)
    expect(m.showManaged).toBe(true)
    expect(m.showManagedUpgrade).toBe(false)
    expect(m.defaultTier).toBe('managed')
  })

  it('hides Listing when module is off', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: false,
      propertyServiceTier: 'listing',
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
      propertyServiceTier: 'listing',
    })
    expect(m.showListing).toBe(true)
    expect(m.showManaged).toBe(false)
    expect(m.defaultTier).toBe('listing')
  })

  it('Managed upgrade only appears for Listing properties where Managed is available', () => {
    const both = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
      propertyServiceTier: 'listing',
    })
    const listingOnly = landlordAcceptTierUiModel({
      state: 'NSW',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
      propertyServiceTier: 'listing',
    })
    expect(both.showManagedUpgrade).toBe(true)
    expect(listingOnly.showManagedUpgrade).toBe(false)
  })

  it('hides Managed when globally disabled', () => {
    const m = landlordAcceptTierUiModel({
      state: 'QLD',
      propertyType: 'entire_property',
      isRegisteredRoomingHouse: false,
      moduleEnabled: true,
      managedGloballyEnabled: false,
      propertyServiceTier: 'listing',
    })
    expect(m.showManaged).toBe(false)
    expect(m.showManagedUpgrade).toBe(false)
    expect(m.defaultTier).toBe('listing')
  })
})
