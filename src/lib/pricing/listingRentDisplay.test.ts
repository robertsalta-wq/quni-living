import { describe, expect, it } from 'vitest'
import {
  formatOccupancyPricingBreakdown,
  getListingRentDisplay,
} from './listingRentDisplay'

describe('listingRentDisplay', () => {
  const casa = {
    rent_per_week: 400,
    max_occupants: 2,
    couple_surcharge_per_week: 100,
    parking_surcharge_per_week: 50,
    parking_available: true,
  }

  it('shows From prefix and breakdown when surcharges exist', () => {
    const d = getListingRentDisplay(casa)
    expect(d.primaryAmount).toBe(400)
    expect(d.showFromPrefix).toBe(true)
    expect(d.maxWeeklyRent).toBe(550)
    expect(formatOccupancyPricingBreakdown(casa)).toContain('$400')
    expect(formatOccupancyPricingBreakdown(casa)).toContain('second person')
  })

  it('flat listing - no From prefix', () => {
    const flat = {
      rent_per_week: 400,
      max_occupants: 1,
      couple_surcharge_per_week: null,
      parking_available: false,
    }
    const d = getListingRentDisplay(flat)
    expect(d.showFromPrefix).toBe(false)
    expect(d.breakdownLine).toBeNull()
  })
})
