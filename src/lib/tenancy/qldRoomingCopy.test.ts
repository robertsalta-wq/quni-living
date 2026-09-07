import { describe, expect, it } from 'vitest'
import {
  qldOffSiteRoomListingNote,
  qldRoomingAcceptGateHeadline,
  qldRoomingAcceptGateParagraphs,
  qldRoomingApplyHoldingCopy,
} from './qldRoomingCopy'

describe('qldRoomingCopy', () => {
  it('says Quni produces Form R18 and that accept is not open', () => {
    const blob = [
      qldRoomingAcceptGateHeadline(),
      ...qldRoomingAcceptGateParagraphs(),
      qldRoomingApplyHoldingCopy(),
      qldOffSiteRoomListingNote(),
    ].join('\n')
    expect(blob).toMatch(/Quni produces Form R18/)
    expect(blob).toMatch(/cannot accept/)
    expect(blob).not.toMatch(/does not generate/)
    expect(blob).not.toMatch(/cannot generate Form R18/)
    expect(qldRoomingAcceptGateHeadline()).toBe('You cannot accept this applicant yet')
  })
})
