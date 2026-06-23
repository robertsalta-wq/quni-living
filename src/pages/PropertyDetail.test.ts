import { describe, expect, it } from 'vitest'
import {
  LISTING_NO_BOND_REQUIRED_TEXT,
  listingHasNoBondRequired,
  listingNoBondQuickInfoItem,
} from './PropertyDetail'

describe('PropertyDetail no-bond signal', () => {
  it('renders no-bond copy when resolved bond is null or 0', () => {
    expect(listingHasNoBondRequired(null)).toBe(true)
    expect(listingHasNoBondRequired(0)).toBe(true)

    expect(listingNoBondQuickInfoItem(null)).toEqual({
      icon: '🔓',
      text: LISTING_NO_BOND_REQUIRED_TEXT,
    })
    expect(listingNoBondQuickInfoItem(0)).toEqual({
      icon: '🔓',
      text: LISTING_NO_BOND_REQUIRED_TEXT,
    })
    expect(LISTING_NO_BOND_REQUIRED_TEXT).toBe('No bond is required for this property.')
  })

  it('does not render no-bond copy when bond is greater than 0', () => {
    expect(listingHasNoBondRequired(900)).toBe(false)
    expect(listingNoBondQuickInfoItem(900)).toBeNull()
  })
})
