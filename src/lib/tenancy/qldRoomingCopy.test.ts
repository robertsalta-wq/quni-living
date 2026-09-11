import { describe, expect, it } from 'vitest'
import {
  qldOffSiteRoomListingNote,
  qldRoomingAcceptDocumentHeadline,
  qldRoomingAcceptDocumentParagraphs,
  qldRoomingItem17OffenceCopy,
  qldRoomingS276AcceptCopy,
} from './qldRoomingCopy'

describe('qldRoomingCopy', () => {
  it('names Form R18 and does not say accept is closed', () => {
    const blob = [
      qldRoomingAcceptDocumentHeadline(),
      ...qldRoomingAcceptDocumentParagraphs(),
      qldOffSiteRoomListingNote(),
    ].join('\n')
    expect(blob).toMatch(/Form R18/)
    expect(blob).toMatch(/Quni produces Form R18/)
    expect(blob).not.toMatch(/cannot accept/)
    expect(blob).not.toMatch(/does not generate/)
  })

  it('names the s 275 offence and s 276 display duty at accept', () => {
    expect(qldRoomingItem17OffenceCopy()).toMatch(/s 275/)
    expect(qldRoomingItem17OffenceCopy()).toMatch(/10 penalty units/)
    expect(qldRoomingS276AcceptCopy()).toMatch(/s 276/)
  })
})
