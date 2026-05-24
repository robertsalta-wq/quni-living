import { describe, expect, it } from 'vitest'

import { resolveServiceTierAvailability } from './index.js'

describe('resolveServiceTierAvailability', () => {
  it('WA → Listing available, Managed unsupported', () => {
    expect(resolveServiceTierAvailability('WA', 't1')).toEqual({
      listing: 'available',
      managed: 'unsupported',
    })
    expect(resolveServiceTierAvailability('wa', 't2')).toEqual({
      listing: 'available',
      managed: 'unsupported',
    })
  })

  it('NSW T1 → Managed available', () => {
    expect(resolveServiceTierAvailability('NSW', 't1')).toEqual({
      listing: 'available',
      managed: 'available',
    })
  })

  it('NSW T2 → Managed gated', () => {
    expect(resolveServiceTierAvailability('NSW', 't2')).toEqual({
      listing: 'available',
      managed: 'gated',
      notes: 'Managed gated pending Jenny legal clearance',
    })
  })

  it('forces Managed gated when managedGloballyEnabled is false', () => {
    expect(resolveServiceTierAvailability('QLD', 't2', { managedGloballyEnabled: false })).toEqual({
      listing: 'available',
      managed: 'gated',
      notes: 'Quni Managed is coming soon.',
    })
  })
})
