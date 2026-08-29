import { describe, expect, it } from 'vitest'
import {
  countDraftListingsWaiting,
  landlordActiveListingsCardSubline,
  landlordDraftPublishPromptCopy,
} from './landlordDraftPublishPrompt'

describe('landlordDraftPublishPrompt', () => {
  it('counts only draft listings', () => {
    expect(countDraftListingsWaiting([])).toBe(0)
    expect(
      countDraftListingsWaiting([
        { status: 'draft' },
        { status: 'active' },
        { status: 'draft' },
        { status: 'inactive' },
      ]),
    ).toBe(2)
  })

  it('hides the homepage prompt when nothing is waiting', () => {
    expect(landlordDraftPublishPromptCopy(0)).toBeNull()
  })

  it('offers a review action for a single draft', () => {
    const copy = landlordDraftPublishPromptCopy(1)
    expect(copy?.title).toBe('Listing waiting to be published')
    expect(copy?.body).toContain('Review it')
    expect(copy?.actionLabel).toBe('Review listing')
  })

  it('sends multiple drafts to the listings tab', () => {
    const copy = landlordDraftPublishPromptCopy(3)
    expect(copy?.title).toBe('Listings waiting to be published')
    expect(copy?.body).toContain('3 listings')
    expect(copy?.body).toContain('review them')
    expect(copy?.actionLabel).toBe('Go to listings')
  })

  it('flags drafts on the active listings card', () => {
    expect(landlordActiveListingsCardSubline(0, 0)).toBe('None published yet')
    expect(landlordActiveListingsCardSubline(2, 0)).toBe('Published as active')
    expect(landlordActiveListingsCardSubline(0, 1)).toBe('1 waiting to publish')
    expect(landlordActiveListingsCardSubline(1, 2)).toBe('2 waiting to publish')
  })
})
