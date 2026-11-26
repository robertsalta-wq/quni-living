import { listingStateFromLandlordProfile } from './adminConciergeListing'

export type ListingStateFieldClears = {
  clearNswBoardingParticulars: boolean
  clearRoomDescription: boolean
  clearNswCompliance: boolean
  clearQldRooming: boolean
  clearVicRooming: boolean
  clearSharedUtilities: boolean
  clearRoomingHouseRegistration: boolean
}

const NONE: ListingStateFieldClears = {
  clearNswBoardingParticulars: false,
  clearRoomDescription: false,
  clearNswCompliance: false,
  clearQldRooming: false,
  clearVicRooming: false,
  clearSharedUtilities: false,
  clearRoomingHouseRegistration: false,
}

/**
 * Shown when a newly confirmed address is in a different state from the last confirmed one.
 * Same state, or no previous state, keeps the answers and shows nothing.
 */
export function listingStateConfirmNotice(fromRaw: string, toRaw: string): string | null {
  const from = listingStateFromLandlordProfile(fromRaw)
  const to = listingStateFromLandlordProfile(toRaw)
  if (!from || !to || from === to) return null
  return `The address is now in ${to}. The ${from} bond, compliance, and rooming answers were cleared. Check the questions below.`
}

/** Fields that belong to the previous state and must not be saved after a state change. */
export function listingStateFieldClears(fromRaw: string, toRaw: string): ListingStateFieldClears {
  const from = listingStateFromLandlordProfile(fromRaw)
  const to = listingStateFromLandlordProfile(toRaw)
  if (!from || from === to) return NONE
  const fromUsesUtilities = from === 'QLD' || from === 'VIC'
  const toUsesUtilities = to === 'QLD' || to === 'VIC'
  return {
    clearNswBoardingParticulars: from === 'NSW',
    clearRoomDescription: from === 'NSW' || from === 'QLD',
    clearNswCompliance: from === 'NSW',
    clearQldRooming: from === 'QLD',
    clearVicRooming: from === 'VIC',
    clearSharedUtilities: fromUsesUtilities && !toUsesUtilities,
    clearRoomingHouseRegistration: from === 'VIC' || to === 'VIC',
  }
}
