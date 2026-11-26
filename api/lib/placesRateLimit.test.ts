import { afterEach, describe, expect, it } from 'vitest'
import {
  PLACES_RATE_LIMIT,
  PLACES_RATE_WINDOW_MS,
  consumePlacesRateLimit,
  resetPlacesRateLimitForTests,
} from './placesRateLimit.js'

afterEach(() => {
  resetPlacesRateLimitForTests()
})

describe('consumePlacesRateLimit', () => {
  it('allows 60 requests a minute for one user and blocks the next', () => {
    const now = 1_700_000_000_000
    for (let i = 0; i < PLACES_RATE_LIMIT; i += 1) {
      expect(consumePlacesRateLimit('landlord-1', now)).toBe(true)
    }
    expect(consumePlacesRateLimit('landlord-1', now)).toBe(false)
    expect(consumePlacesRateLimit('landlord-2', now)).toBe(true)
  })

  it('opens a new window after a minute', () => {
    const now = 1_700_000_000_000
    for (let i = 0; i < PLACES_RATE_LIMIT; i += 1) consumePlacesRateLimit('landlord-1', now)
    expect(consumePlacesRateLimit('landlord-1', now + PLACES_RATE_WINDOW_MS)).toBe(true)
  })
})
