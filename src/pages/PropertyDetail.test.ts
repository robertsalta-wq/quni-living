import { describe, expect, it } from 'vitest'
import {
  formatListingBondDisplayLabel,
  LISTING_NO_BOND_REQUIRED_TEXT,
  listingCoupleOccupancyWeeklyRentAud,
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

describe('PropertyDetail occupancy-aware bond display', () => {
  const bondProperty = { bond_weeks: 2 }
  const coupleListing = {
    rent_per_week: 450,
    max_occupants: 2,
    couple_surcharge_per_week: 100,
  }

  it('resolves couple occupancy rent as base plus surcharge', () => {
    expect(listingCoupleOccupancyWeeklyRentAud(coupleListing)).toBe(550)
  })

  it('shows single- and two-person bond when couple surcharge exists', () => {
    expect(
      formatListingBondDisplayLabel(bondProperty, 450, 550),
    ).toBe('$900 (1 person) · $1,100 for two')
  })

  it('shows a single bond figure when there is no couple surcharge', () => {
    expect(formatListingBondDisplayLabel(bondProperty, 450, null)).toBe('$900')
    expect(
      formatListingBondDisplayLabel(
        bondProperty,
        450,
        listingCoupleOccupancyWeeklyRentAud({
          rent_per_week: 450,
          max_occupants: 1,
          couple_surcharge_per_week: 100,
        }),
      ),
    ).toBe('$900')
  })
})
