import { describe, expect, it, vi } from 'vitest'
import {
  ACCEPT_FINISH_CLAIM_PREFIX,
  ACCEPT_FINISH_CLAIM_TTL_MS,
  decideListingAcceptance,
  executeListingAcceptance,
  scheduleListingAcceptanceFinish,
  type ListingAcceptanceSnapshot,
  type ListingAcceptanceStore,
} from './finishListingAcceptance.js'

function snapshot(overrides: Partial<ListingAcceptanceSnapshot> = {}): ListingAcceptanceSnapshot {
  return {
    agreementStatus: 'pending',
    submissionId: null,
    claim: null,
    acceptanceEmailAttempted: false,
    agreementReadyEmailAttempted: false,
    ...overrides,
  }
}

function memoryStore(initial: ListingAcceptanceSnapshot) {
  let state = { ...initial }
  const generate = vi.fn(async () => {
    state = { ...state, submissionId: 'sub-1' }
    return { ok: true as const, submissionId: 'sub-1' }
  })
  const sendAcceptanceEmails = vi.fn(async () => {
    state = { ...state, acceptanceEmailAttempted: true }
  })
  const sendAgreementReadyEmails = vi.fn(async () => {
    state = { ...state, agreementReadyEmailAttempted: true }
  })
  const store: ListingAcceptanceStore = {
    read: async () => ({ ...state }),
    claim: async (previousClaim) => {
      if (state.claim !== previousClaim) return false
      state = { ...state, claim: `${ACCEPT_FINISH_CLAIM_PREFIX}${Date.now()}` }
      return true
    },
    markReady: async () => {
      state = { ...state, agreementStatus: 'ready', claim: null }
    },
    markFailed: async (message) => {
      state = { ...state, agreementStatus: 'failed', claim: message }
    },
    generate,
    sendAcceptanceEmails,
    sendAgreementReadyEmails,
  }
  return { store, generate, sendAcceptanceEmails, sendAgreementReadyEmails, read: () => state }
}

describe('decideListingAcceptance', () => {
  const now = 1_000_000

  it('is done when the agreement is already ready', () => {
    expect(
      decideListingAcceptance(snapshot({ agreementStatus: 'ready', submissionId: 'sub-1' }), now),
    ).toBe('done')
    expect(decideListingAcceptance(snapshot({ agreementStatus: 'ready', submissionId: null }), now)).toBe(
      'done',
    )
  })

  it('is busy while a claim is still fresh', () => {
    expect(
      decideListingAcceptance(
        snapshot({ claim: `${ACCEPT_FINISH_CLAIM_PREFIX}${now - 1_000}` }),
        now,
      ),
    ).toBe('busy')
  })

  it('runs again when the claim is older than the worker budget', () => {
    expect(
      decideListingAcceptance(
        snapshot({ claim: `${ACCEPT_FINISH_CLAIM_PREFIX}${now - ACCEPT_FINISH_CLAIM_TTL_MS - 1}` }),
        now,
      ),
    ).toBe('run')
  })
})

describe('executeListingAcceptance', () => {
  it('creates one submission, then a retry does not create another or resend', async () => {
    const mem = memoryStore(snapshot())
    const first = await executeListingAcceptance(mem.store)
    const second = await executeListingAcceptance(mem.store)

    expect(first).toEqual({ outcome: 'ready', createdSubmission: true })
    expect(second).toEqual({ outcome: 'done', createdSubmission: false })
    expect(mem.generate).toHaveBeenCalledTimes(1)
    expect(mem.sendAcceptanceEmails).toHaveBeenCalledTimes(1)
    expect(mem.sendAgreementReadyEmails).toHaveBeenCalledTimes(1)
  })

  it('a retry finishes a missing agreement without a second submission', async () => {
    const mem = memoryStore(snapshot({ agreementStatus: 'pending', submissionId: null }))
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mem.generate.mockImplementationOnce(async () => {
      await gate
      return { ok: true, submissionId: 'sub-1' }
    })

    const first = executeListingAcceptance(mem.store)
    await vi.waitFor(() => expect(mem.generate).toHaveBeenCalledTimes(1))

    const overlapped = await executeListingAcceptance(mem.store)
    expect(overlapped.outcome).toBe('busy')
    expect(mem.generate).toHaveBeenCalledTimes(1)

    release()
    await expect(first).resolves.toMatchObject({ outcome: 'ready', createdSubmission: true })

    const retry = await executeListingAcceptance(mem.store)
    expect(retry).toEqual({ outcome: 'done', createdSubmission: false })
    expect(mem.generate).toHaveBeenCalledTimes(1)
  })

  it('does not generate when the submission is already there', async () => {
    const mem = memoryStore(
      snapshot({
        agreementStatus: 'pending',
        submissionId: 'sub-existing',
        acceptanceEmailAttempted: true,
        agreementReadyEmailAttempted: true,
      }),
    )
    const result = await executeListingAcceptance(mem.store)
    expect(result).toEqual({ outcome: 'ready', createdSubmission: false })
    expect(mem.generate).not.toHaveBeenCalled()
    expect(mem.sendAcceptanceEmails).not.toHaveBeenCalled()
    expect(mem.sendAgreementReadyEmails).not.toHaveBeenCalled()
  })
})

describe('scheduleListingAcceptanceFinish', () => {
  it('registers the slow work with waitUntil and does not block the caller', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let finished = false
    const waitUntil = vi.fn()

    scheduleListingAcceptanceFinish(async () => {
      await gate
      finished = true
    }, waitUntil)

    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(finished).toBe(false)

    release()
    await waitUntil.mock.calls[0]?.[0]
    expect(finished).toBe(true)
  })
})
