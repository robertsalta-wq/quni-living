import { describe, expect, it } from 'vitest'
import { listingStateFieldClears } from './listingFormStateChange'

describe('listingStateFieldClears', () => {
  it('clears nothing until a known state changes', () => {
    expect(listingStateFieldClears('', 'NSW').clearNswBoardingParticulars).toBe(false)
    expect(listingStateFieldClears('NSW', 'nsw').clearVicRooming).toBe(false)
  })

  it('clears NSW boarding fields and the registration card when the draft becomes VIC', () => {
    const clears = listingStateFieldClears('NSW', 'VIC')
    expect(clears.clearNswBoardingParticulars).toBe(true)
    expect(clears.clearNswCompliance).toBe(true)
    expect(clears.clearRoomingHouseRegistration).toBe(true)
    expect(clears.clearVicRooming).toBe(false)
    expect(clears.clearQldRooming).toBe(false)
  })

  it('clears Victorian rooming fields when the state leaves VIC', () => {
    const clears = listingStateFieldClears('VIC', 'QLD')
    expect(clears.clearVicRooming).toBe(true)
    expect(clears.clearQldRooming).toBe(false)
    expect(clears.clearSharedUtilities).toBe(false)
    expect(clears.clearRoomingHouseRegistration).toBe(true)
  })

  it('clears Queensland rooming fields and shared utilities when the state leaves both', () => {
    const clears = listingStateFieldClears('QLD', 'NSW')
    expect(clears.clearQldRooming).toBe(true)
    expect(clears.clearRoomDescription).toBe(true)
    expect(clears.clearSharedUtilities).toBe(true)
    expect(clears.clearNswCompliance).toBe(false)
  })
})
