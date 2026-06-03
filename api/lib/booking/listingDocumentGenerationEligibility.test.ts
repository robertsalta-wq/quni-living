import { describe, expect, it } from 'vitest'

import {
  bookingAllowsTenancyDocumentGeneration,
  isListingPreviewGeneration,
} from './listingDocumentGenerationEligibility.js'

describe('bookingAllowsTenancyDocumentGeneration', () => {
  it('allows listing bond_pending (accept-time generate with defer_signing false)', () => {
    expect(
      bookingAllowsTenancyDocumentGeneration({
        status: 'bond_pending',
        service_tier_final: 'listing',
      }),
    ).toBe(true)
  })

  it('allows listing preview with defer_signing', () => {
    expect(
      isListingPreviewGeneration(true, {
        status: 'bond_pending',
        service_tier_final: 'listing',
      }),
    ).toBe(true)
  })

  it('rejects bond_pending without listing tier', () => {
    expect(
      bookingAllowsTenancyDocumentGeneration({
        status: 'bond_pending',
        service_tier_final: 'managed',
      }),
    ).toBe(false)
  })
})
