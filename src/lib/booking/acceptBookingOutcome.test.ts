import { describe, expect, it } from 'vitest'
import {
  ACCEPT_NETWORK_RETRY_MESSAGE,
  ACCEPT_UNKNOWN_MESSAGE,
  acceptFailureOutcome,
} from './acceptBookingOutcome'

describe('acceptFailureOutcome', () => {
  it('shows the accepted screen when a lost response already accepted the booking', () => {
    const outcome = acceptFailureOutcome({
      error: new TypeError('Load failed'),
      refetchedStatus: 'bond_pending',
      refetchFailed: false,
    })
    expect(outcome).toEqual({ kind: 'accepted' })
  })

  it('shows a plain retry message when the booking was not accepted', () => {
    const outcome = acceptFailureOutcome({
      error: new TypeError('Load failed'),
      refetchedStatus: 'pending_confirmation',
      refetchFailed: false,
    })
    expect(outcome).toEqual({ kind: 'message', message: ACCEPT_NETWORK_RETRY_MESSAGE })
    if (outcome.kind === 'message') {
      expect(outcome.message).not.toContain('Load failed')
    }
  })

  it('asks for a refresh when the refetch itself fails', () => {
    const outcome = acceptFailureOutcome({
      error: new TypeError('Load failed'),
      refetchedStatus: null,
      refetchFailed: true,
    })
    expect(outcome).toEqual({ kind: 'message', message: ACCEPT_UNKNOWN_MESSAGE })
  })

  it('keeps a real server message and still hides a raw fetch error', () => {
    expect(
      acceptFailureOutcome({
        error: new Error('Add payout bank details for this property before accepting.'),
        refetchedStatus: null,
        refetchFailed: false,
      }),
    ).toEqual({
      kind: 'message',
      message: 'Add payout bank details for this property before accepting.',
    })

    const raw = acceptFailureOutcome({
      error: new TypeError('Load failed'),
      refetchedStatus: 'pending_confirmation',
      refetchFailed: false,
    })
    expect(raw.kind).toBe('message')
    if (raw.kind === 'message') expect(raw.message).not.toMatch(/load failed/i)
  })
})
