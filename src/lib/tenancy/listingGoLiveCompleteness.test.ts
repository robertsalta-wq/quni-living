import { describe, expect, it } from 'vitest'
import {
  listingGoLiveCompletenessBlock,
  type ListingGoLiveCompletenessInput,
} from './listingGoLiveCompleteness'

function input(patch: Partial<ListingGoLiveCompletenessInput> = {}): ListingGoLiveCompletenessInput {
  return {
    state: 'NSW',
    propertyType: 'entire_property',
    isRegisteredRoomingHouse: false,
    serviceTier: 'managed',
    roomDescription: '',
    roomsRentedToResidents: null,
    sharesKitchenOrBathroom: null,
    personsAtPremises: null,
    maxOccupants: 1,
    rentPaymentMethod2: null,
    rentPaymentMethod2Costs: null,
    rentPaymentMethod2FinancialBenefit: null,
    rentLastIncreasedOn: null,
    registrationNumber: null,
    featureNames: [],
    waterUsageChargedSeparately: false,
    waterAttested: false,
    accuracyAttested: true,
    nonDiscriminationAccepted: true,
    utilitiesServices: null,
    compliance: {
      smoke_alarm_type: 'battery',
      smoke_alarm_battery_tenant_replaceable: false,
      water_usage_charged_separately: false,
      electricity_embedded_network: false,
      gas_embedded_network: false,
      strata_bylaws_applicable: false,
      strata_oc_responsible_for_alarms: null,
    },
    payee: null,
    providerNotice: null,
    ...patch,
  }
}

describe('listingGoLiveCompletenessBlock', () => {
  it('allows a complete NSW listing that is not in a strata scheme', () => {
    expect(listingGoLiveCompletenessBlock(input())).toBeNull()
  })

  it('blocks NSW smoke-alarm gaps and does not require by-laws when the scheme answer is no', () => {
    const missing = listingGoLiveCompletenessBlock(
      input({
        compliance: {
          strata_bylaws_applicable: false,
          water_usage_charged_separately: false,
          electricity_embedded_network: false,
          gas_embedded_network: false,
        },
      }),
    )
    expect(missing).toContain('Smoke alarm type')
    expect(missing).not.toContain('by-laws')
  })

  it('blocks an unanswered NSW strata question without also demanding by-laws', () => {
    const missing = listingGoLiveCompletenessBlock(
      input({
        compliance: {
          smoke_alarm_type: 'battery',
          smoke_alarm_battery_tenant_replaceable: false,
          water_usage_charged_separately: false,
          electricity_embedded_network: false,
          gas_embedded_network: false,
          strata_bylaws_applicable: null,
          strata_oc_responsible_for_alarms: null,
        },
      }),
    )
    expect(missing).toContain('Property in strata or community scheme')
    expect(missing).not.toContain('by-laws')
  })

  it('blocks QLD utilities until each service is answered', () => {
    const missing = listingGoLiveCompletenessBlock(
      input({
        state: 'QLD',
        propertyType: 'entire_property',
        compliance: {},
      }),
    )
    expect(missing).toContain('utilities')
  })

  it('skips per-service utilities when bills are included', () => {
    expect(
      listingGoLiveCompletenessBlock(
        input({
          state: 'VIC',
          propertyType: 'entire_property',
          featureNames: ['bills included'],
          compliance: {},
        }),
      ),
    ).toBeNull()
  })

  it('blocks publish when the accuracy confirmation was never given', () => {
    expect(listingGoLiveCompletenessBlock(input({ accuracyAttested: false }))).toMatch(/accurate/i)
  })

  it('blocks a Listing-tier publish until payee details are complete', () => {
    expect(listingGoLiveCompletenessBlock(input({ serviceTier: 'listing', payee: null }))).toMatch(/Account name/i)
  })
})
