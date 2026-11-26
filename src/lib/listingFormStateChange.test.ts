import { describe, expect, it } from 'vitest'
import {
  listingStateConfirmNotice,
  listingStateFieldClears,
  listingStateHadClearedAnswers,
} from './listingFormStateChange'

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

  it('notices only when a confirmed address moves to another state', () => {
    expect(listingStateConfirmNotice('', 'VIC')).toBeNull()
    expect(listingStateConfirmNotice('NSW', 'NSW')).toBeNull()
    expect(listingStateConfirmNotice('nsw', 'NSW')).toBeNull()
    expect(listingStateConfirmNotice('SA', 'NSW')).toBeNull()
    expect(listingStateConfirmNotice('NSW', 'VIC', false)).toBeNull()
    expect(listingStateConfirmNotice('NSW', 'VIC')).toBe(
      'The address is now in VIC. The NSW bond, compliance, and rooming answers were cleared. Check the questions below.',
    )
  })

  it('treats an empty or unsupported previous state as having nothing to clear', () => {
    expect(listingStateHadClearedAnswers('SA', 'NSW', { nswCompliance: { smokeAlarmType: 'battery' } })).toBe(false)
    expect(listingStateHadClearedAnswers('', 'NSW', { roomDescription: 'Room 2' })).toBe(false)
    expect(listingStateHadClearedAnswers('NSW', 'VIC', {})).toBe(false)
    expect(listingStateHadClearedAnswers('NSW', 'VIC', { nswCompliance: { smokeAlarmType: '' } })).toBe(false)
    expect(listingStateHadClearedAnswers('NSW', 'QLD', { registration: { number: 'ABC' } })).toBe(false)
    expect(listingStateHadClearedAnswers('NSW', 'VIC', { nswCompliance: { smokeAlarmType: 'battery' } })).toBe(true)
    expect(listingStateHadClearedAnswers('VIC', 'NSW', { registration: { number: 'ABC' } })).toBe(true)
    expect(listingStateHadClearedAnswers('QLD', 'NSW', { utilities: { waterUsageChargedSeparately: 'yes' } })).toBe(
      true,
    )
  })

  it('clears Queensland rooming fields and shared utilities when the state leaves both', () => {
    const clears = listingStateFieldClears('QLD', 'NSW')
    expect(clears.clearQldRooming).toBe(true)
    expect(clears.clearRoomDescription).toBe(true)
    expect(clears.clearSharedUtilities).toBe(true)
    expect(clears.clearNswCompliance).toBe(false)
  })
})
