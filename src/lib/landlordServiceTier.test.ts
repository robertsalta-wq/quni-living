import { describe, expect, it } from 'vitest'
import {
  canSwitchPropertyServiceTier,
  landlordServiceTierShortLabel,
  landlordServiceTierTitle,
  parseLandlordServiceTier,
} from './landlordServiceTier'

describe('parseLandlordServiceTier', () => {
  it('returns the value for valid tiers', () => {
    expect(parseLandlordServiceTier('listing')).toBe('listing')
    expect(parseLandlordServiceTier('managed')).toBe('managed')
  })

  it('returns null for unknown / non-string input', () => {
    expect(parseLandlordServiceTier(null)).toBe(null)
    expect(parseLandlordServiceTier(undefined)).toBe(null)
    expect(parseLandlordServiceTier('')).toBe(null)
    expect(parseLandlordServiceTier('LISTING')).toBe(null)
    expect(parseLandlordServiceTier('Premium')).toBe(null)
    expect(parseLandlordServiceTier(7)).toBe(null)
    expect(parseLandlordServiceTier({ tier: 'listing' })).toBe(null)
  })
})

describe('canSwitchPropertyServiceTier (one-way ratchet)', () => {
  it('allows brand-new listings to start as either tier', () => {
    expect(canSwitchPropertyServiceTier(null, 'listing')).toBe(true)
    expect(canSwitchPropertyServiceTier(null, 'managed')).toBe(true)
    expect(canSwitchPropertyServiceTier(undefined, 'listing')).toBe(true)
    expect(canSwitchPropertyServiceTier(undefined, 'managed')).toBe(true)
  })

  it('allows no-op selections (same tier)', () => {
    expect(canSwitchPropertyServiceTier('listing', 'listing')).toBe(true)
    expect(canSwitchPropertyServiceTier('managed', 'managed')).toBe(true)
  })

  it('allows the Listing -> Managed upgrade', () => {
    expect(canSwitchPropertyServiceTier('listing', 'managed')).toBe(true)
  })

  it('blocks the Managed -> Listing downgrade', () => {
    expect(canSwitchPropertyServiceTier('managed', 'listing')).toBe(false)
  })
})

describe('display helpers', () => {
  it('returns full titles for known tiers and a sensible fallback for unknown', () => {
    expect(landlordServiceTierTitle('listing')).toContain('Listing')
    expect(landlordServiceTierTitle('managed')).toContain('Managed')
    expect(landlordServiceTierTitle(null)).toContain('Managed')
  })

  it('returns short labels for known tiers and a sensible fallback for unknown', () => {
    expect(landlordServiceTierShortLabel('listing')).toBe('Self-managed')
    expect(landlordServiceTierShortLabel('managed')).toBe('Quni Managed')
    expect(landlordServiceTierShortLabel(null)).toBe('Quni Managed')
  })
})
