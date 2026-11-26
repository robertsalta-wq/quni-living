import { describe, expect, it } from 'vitest'
import { manualConfirmCanUseNominatim } from './googlePlacesClient'

describe('manualConfirmCanUseNominatim', () => {
  it('uses Nominatim when Google never answered', () => {
    expect(manualConfirmCanUseNominatim('not_configured')).toBe(true)
    expect(manualConfirmCanUseNominatim('unauthorized')).toBe(true)
    expect(manualConfirmCanUseNominatim('unavailable')).toBe(true)
    expect(manualConfirmCanUseNominatim('rate_limited')).toBe(true)
  })

  it('keeps a real Google answer or a non-landlord refusal on the form', () => {
    expect(manualConfirmCanUseNominatim('mismatch')).toBe(false)
    expect(manualConfirmCanUseNominatim('not_found')).toBe(false)
    expect(manualConfirmCanUseNominatim('forbidden')).toBe(false)
  })
})
