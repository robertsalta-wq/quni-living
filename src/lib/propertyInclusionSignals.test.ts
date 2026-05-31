import { describe, expect, it } from 'vitest'
import {
  listingInclusionSummaryLabels,
  resolvePropertyInclusionSignals,
} from './propertyInclusionSignals'

describe('resolvePropertyInclusionSignals', () => {
  it('uses inclusion columns when set', () => {
    expect(
      resolvePropertyInclusionSignals({
        furnished: false,
        linen_supplied: true,
        weekly_cleaning_service: true,
      }),
    ).toMatchObject({
      linenSupplied: true,
      weeklyCleaning: true,
      furnished: false,
    })
  })

  it('falls back to feature names when columns are false', () => {
    const signals = resolvePropertyInclusionSignals({
      linen_supplied: false,
      property_features: [{ features: { name: 'Linen supplied' } }],
    })
    expect(signals.linenSupplied).toBe(true)
    expect(listingInclusionSummaryLabels(signals)).toContain('Linen supplied')
  })

  it('detects bills included from features', () => {
    const signals = resolvePropertyInclusionSignals({
      property_features: [{ features: { name: 'Bills included' } }],
    })
    expect(signals.billsIncluded).toBe(true)
  })
})
