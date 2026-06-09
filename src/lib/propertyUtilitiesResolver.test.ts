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
      utilitiesServices: null,
    })

    expect(resolution.allInclusive).toBe(true)
    expect(resolution.services.electricity.tenantMustPay).toBe(false)
    expect(resolution.services.gas.tenantMustPay).toBe(false)
    expect(resolution.services.water.tenantMustPay).toBe(false)
    expect(resolution.listingDisclosureLabels).toContain('Bills included')
    expect(resolution.listingDisclosureLabels).toContain('Water included in rent')
  })

  it('resolves non-inclusive with metered gas and apportioned electricity', () => {
    const resolution = resolvePropertyUtilities({
      featureNames: ['furnished'],
      waterUsageChargedSeparately: false,
      electricityEmbeddedNetwork: null,
      gasEmbeddedNetwork: null,
      waterSeparatelyMeteredEfficientAttestedAt: null,
      utilitiesServices: {
        electricity: {
          tenant_pays: true,
          individually_metered: false,
          apportionment_method: '50% of common area electricity divided by occupants',
          how_must_be_paid: 'Invoiced quarterly via Quni',
        },
        gas: {
          tenant_pays: true,
          individually_metered: true,
          apportionment_method: null,
          how_must_be_paid: 'Direct to retailer account',
        },
      },
    })

    expect(resolution.billsIncluded).toBe(false)
    expect(resolution.services.electricity.tenantMustPay).toBe(true)
    expect(resolution.services.electricity.apportionmentCost).toContain('50%')
    expect(resolution.services.electricity.howMustBePaid).toContain('quarterly')
    expect(resolution.services.gas.tenantMustPay).toBe(true)
    expect(resolution.services.gas.apportionmentCost).toBeNull()
    expect(resolution.services.gas.howMustBePaid).toContain('retailer')
    expect(resolution.listingDisclosureLabels.some((l) => l.includes('apportioned'))).toBe(true)
    expect(resolution.listingDisclosureLabels.some((l) => l.includes('individually metered'))).toBe(true)
  })
})

describe('propertyUtilitiesPreflightMessages', () => {
  it('requires per-service capture when bills not included', () => {
    const input = propertyUtilitiesInputFromPropertyRow(
      { water_usage_charged_separately: false, utilities_services: null },
      ['furnished'],
    )
    const messages = propertyUtilitiesPreflightMessages(input)
    expect(messages.some((m) => m.includes('electricity'))).toBe(true)
    expect(messages.some((m) => m.includes('gas'))).toBe(true)
  })

  it('requires water attestation when water charged separately', () => {
    const input = propertyUtilitiesInputFromPropertyRow(
      {
        water_usage_charged_separately: true,
        utilities_services: {
          electricity: {
            tenant_pays: true,
            individually_metered: true,
            apportionment_method: null,
            how_must_be_paid: 'Direct debit',
          },
          gas: {
            tenant_pays: false,
            individually_metered: null,
            apportionment_method: null,
            how_must_be_paid: null,
          },
        },
      },
      ['furnished'],
    )
    const messages = propertyUtilitiesPreflightMessages(input)
    expect(messages.some((m) => m.includes('separately metered'))).toBe(true)
  })

  it('passes when non-inclusive listing is fully specified', () => {
    const input = propertyUtilitiesInputFromPropertyRow(
      {
        water_usage_charged_separately: false,
        utilities_services: {
          electricity: {
            tenant_pays: true,
            individually_metered: false,
            apportionment_method: 'Equal split among 4 bedrooms',
            how_must_be_paid: 'Quarterly invoice',
          },
          gas: {
            tenant_pays: true,
            individually_metered: true,
            apportionment_method: null,
            how_must_be_paid: 'Retailer account',
          },
        },
      },
      ['furnished'],
    )
    expect(propertyUtilitiesPreflightMessages(input)).toEqual([])
  })
})
