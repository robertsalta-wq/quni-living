import { describe, expect, it } from 'vitest'
import { listingPageShowsPublishButton } from './listingPagePublish'

describe('listingPageShowsPublishButton', () => {
  it('shows Publish on owner preview for a saved draft landlord listing', () => {
    expect(
      listingPageShowsPublishButton({
        status: 'draft',
        role: 'landlord',
        hasSavedProperty: true,
      }),
    ).toBe(true)
  })

  it('hides Publish on a brand-new listing that is not saved yet', () => {
    expect(
      listingPageShowsPublishButton({
        status: 'draft',
        role: 'landlord',
        hasSavedProperty: false,
      }),
    ).toBe(false)
  })

  it('hides Publish once the listing is live', () => {
    expect(
      listingPageShowsPublishButton({
        status: 'active',
        role: 'landlord',
        hasSavedProperty: true,
      }),
    ).toBe(false)
  })

  it('hides Publish for admin concierge drafts', () => {
    expect(
      listingPageShowsPublishButton({
        status: 'draft',
        role: 'admin',
        hasSavedProperty: true,
      }),
    ).toBe(false)
  })
})
