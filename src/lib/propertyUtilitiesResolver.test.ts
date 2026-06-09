import { describe, expect, it } from 'vitest'
import {
  propertyUtilitiesInputFromPropertyRow,
  propertyUtilitiesPreflightMessages,
  resolvePropertyUtilities,
} from './propertyUtilitiesResolver'

describe('resolvePropertyUtilities', () => {
  it('resolves all-inclusive when bills included and water not charged separately', () => {
    const resolution = resolvePropertyUtilities({
      featureNames: ['bills included'],
      waterUsageChargedSeparately: false,
      electricityEmbeddedNetwork: false,
      gasEmbeddedNetwork: false,
      waterSeparatelyMeteredEfficientAttestedAt: null,
    })

    expect(resolution.allInclusive).toBe(true)
    expect(resolution.services.electricity.tenantMustPay).toBe(false)
    expect(resolution.services.gas.tenantMustPay).toBe(false)
    expect(resolution.services.water.tenantMustPay).toBe(false)
    expect(resolution.services.phone.tenantMustPay).toBe(false)
    expect(resolution.services.other.tenantMustPay).toBe(false)
    expect(resolution.listingDisclosureLabels).toContain('Bills included')
    expect(resolution.listingDisclosureLabels).toContain('Water included in rent')
  })

  it('resolves water charged separately when attested', () => {
    const resolution = resolvePropertyUtilities({
      featureNames: ['Bills included'],
      waterUsageChargedSeparately: true,
      electricityEmbeddedNetwork: null,
      gasEmbeddedNetwork: null,
      waterSeparatelyMeteredEfficientAttestedAt: '2026-06-09T12:00:00.000Z',
    })

    expect(resolution.allInclusive).toBe(false)
    expect(resolution.waterChargedSeparately).toBe(true)
    expect(resolution.services.water.tenantMustPay).toBe(true)
    expect(resolution.services.electricity.tenantMustPay).toBe(false)
    expect(resolution.waterSeparatelyMeteredEfficientAttested).toBe(true)
  })
})

describe('propertyUtilitiesPreflightMessages', () => {
  it('blocks non-inclusive listings under mandate-all-inclusive', () => {
    const input = propertyUtilitiesInputFromPropertyRow(
      { water_usage_charged_separately: false },
      ['furnished'],
    )
    const messages = propertyUtilitiesPreflightMessages(input, { mandateAllInclusive: true })
    expect(messages.some((m) => m.includes('bills'))).toBe(true)
  })

  it('requires water attestation when water charged separately', () => {
    const input = propertyUtilitiesInputFromPropertyRow(
      { water_usage_charged_separately: true },
      ['bills included'],
    )
    const messages = propertyUtilitiesPreflightMessages(input, { mandateAllInclusive: true })
    expect(messages.some((m) => m.includes('separately metered'))).toBe(true)
  })
})
