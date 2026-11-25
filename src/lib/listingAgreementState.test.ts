import { describe, expect, it } from 'vitest'
import {
  hasListingStateSpecificAnswers,
  isListingAgreementState,
  listingStateChangeConfirmMessage,
  listingStateChangeNeedsConfirm,
  unsupportedListingStateMessage,
} from './listingAgreementState'

describe('listingAgreementState', () => {
  it('treats only NSW, QLD and VIC as agreement states', () => {
    expect(isListingAgreementState('NSW')).toBe(true)
    expect(isListingAgreementState('qld')).toBe(true)
    expect(isListingAgreementState('VIC')).toBe(true)
    expect(isListingAgreementState('WA')).toBe(false)
    expect(isListingAgreementState('')).toBe(false)
  })

  it('names the unsupported state in the form message', () => {
    expect(unsupportedListingStateMessage('wa')).toBe("Quni doesn't support listings in WA yet")
  })

  it('asks before clearing a state that already has answers', () => {
    expect(listingStateChangeConfirmMessage('NSW')).toBe(
      'Changing the state clears the answers for NSW. Continue?',
    )
    expect(
      listingStateChangeNeedsConfirm({ fromState: 'NSW', toState: 'WA', hasSpecificAnswers: true }),
    ).toBe(true)
    expect(
      listingStateChangeNeedsConfirm({ fromState: 'NSW', toState: 'VIC', hasSpecificAnswers: false }),
    ).toBe(false)
    expect(
      listingStateChangeNeedsConfirm({ fromState: '', toState: 'NSW', hasSpecificAnswers: false }),
    ).toBe(false)
    expect(
      listingStateChangeNeedsConfirm({ fromState: 'WA', toState: 'NSW', hasSpecificAnswers: false }),
    ).toBe(false)
    expect(
      listingStateChangeNeedsConfirm({ fromState: 'NSW', toState: 'nsw', hasSpecificAnswers: true }),
    ).toBe(false)
  })

  it('notices state-specific answers and ignores an empty form', () => {
    expect(hasListingStateSpecificAnswers('NSW', { nsw: { smokeAlarmType: '' } })).toBe(false)
    expect(hasListingStateSpecificAnswers('NSW', { nsw: { smokeAlarmType: 'battery' } })).toBe(true)
    expect(hasListingStateSpecificAnswers('QLD', { qldBondIsCustom: true })).toBe(true)
    expect(hasListingStateSpecificAnswers('VIC', { vic: { capacity: '4' } })).toBe(true)
    expect(hasListingStateSpecificAnswers('WA', { nsw: { smokeAlarmType: 'battery' } })).toBe(false)
  })
})
