import { listingStateFromLandlordProfile } from './adminConciergeListing'
import { isListingAgreementState } from './listingAgreementState'

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

function answerPresent(value: unknown): boolean {
  if (value == null || value === false || value === '') return false
  if (typeof value === 'number') return true
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.some(answerPresent)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(answerPresent)
  return true
}

export type ListingStateAnswerBuckets = {
  nswBoarding?: unknown
  roomDescription?: unknown
  nswCompliance?: unknown
  qldRooming?: unknown
  vicRooming?: unknown
  utilities?: unknown
  registration?: unknown
}

/**
 * True when the state change would wipe a bucket that currently holds an answer.
 * An unsupported previous state never counts: it is not a confirmed listing state.
 */
export function listingStateHadClearedAnswers(
  fromRaw: string,
  toRaw: string,
  answers: ListingStateAnswerBuckets,
): boolean {
  const from = listingStateFromLandlordProfile(fromRaw)
  if (!from || !isListingAgreementState(from)) return false
  const clears = listingStateFieldClears(fromRaw, toRaw)
  return (
    (clears.clearNswBoardingParticulars && answerPresent(answers.nswBoarding)) ||
    (clears.clearRoomDescription && answerPresent(answers.roomDescription)) ||
    (clears.clearNswCompliance && answerPresent(answers.nswCompliance)) ||
    (clears.clearQldRooming && answerPresent(answers.qldRooming)) ||
    (clears.clearVicRooming && answerPresent(answers.vicRooming)) ||
    (clears.clearSharedUtilities && answerPresent(answers.utilities)) ||
    (clears.clearRoomingHouseRegistration && answerPresent(answers.registration))
  )
}

/**
 * Shown when a newly confirmed address is in a different agreement state and that
 * change cleared answers. Same state, no previous state, an unsupported previous
 * state, or an empty previous state shows nothing.
 */
export function listingStateConfirmNotice(
  fromRaw: string,
  toRaw: string,
  clearedAnswers = true,
): string | null {
  const from = listingStateFromLandlordProfile(fromRaw)
  const to = listingStateFromLandlordProfile(toRaw)
  if (!from || !to || from === to || !isListingAgreementState(from) || !isListingAgreementState(to)) return null
  if (!clearedAnswers) return null
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
