import { describe, expect, it } from 'vitest'
import { SAMPLE_LISTING_AD, extractListingFromAd } from './extractListingFromAd'

describe('extractListingFromAd', () => {
  it('extracts rent, suburb, campus, and highlights from the sample ad', () => {
    const preview = extractListingFromAd(SAMPLE_LISTING_AD)
    expect(preview.rentWeekly).toBe(320)
    expect(preview.suburb).toBe('Kingsford')
    expect(preview.campusHint).toBe('UNSW')
    expect(preview.roomType).toBe('Private room')
    expect(preview.echo).toBe(SAMPLE_LISTING_AD)
    expect(preview.highlights.some((h) => /Furnished/i.test(h))).toBe(true)
    expect(preview.available).toMatch(/early March/i)
  })

  it('returns empty fields for blank input', () => {
    const preview = extractListingFromAd('   ')
    expect(preview.echo).toBe('')
    expect(preview.rentWeekly).toBeNull()
    expect(preview.highlights).toEqual([])
  })
})
