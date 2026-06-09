import { propertyBillsIncluded } from './propertyFeatureSignals.js'
import { propertyHasWaterSeparatelyMeteredAttestation } from './waterSeparatelyMeteredAttestation.js'

export type UtilityServiceId = 'electricity' | 'gas' | 'water' | 'phone' | 'other'

export type UtilityPayer = 'tenant' | 'lessor'

/** How a utility charge is determined; extensible for future per-service capture. */
export type UtilityChargeBasis =
  | 'included_in_rent'
  | 'metered_separate'
  | 'apportionment'
  | 'embedded_network'

export type ResolvedUtilityService = {
  id: UtilityServiceId
  /** Prescribed-form "tenant must pay" checkbox (Items 13.1 / FT6600 equivalents). */
  tenantMustPay: boolean
  payer: UtilityPayer
  basis: UtilityChargeBasis
  /** Form 18a Item 14 — only when tenantMustPay. */
  apportionmentCost: string | null
  /** Form 18a Item 15 — only when tenantMustPay. */
  howMustBePaid: string | null
}

export type PropertyUtilitiesInput = {
  featureNames: string[]
  waterUsageChargedSeparately: boolean | null
  electricityEmbeddedNetwork: boolean | null
  gasEmbeddedNetwork: boolean | null
  waterSeparatelyMeteredEfficientAttestedAt: string | null
}

export type PropertyUtilitiesResolution = {
  billsIncluded: boolean
  /** Bills included with no separate water charge — platform mandate-all-inclusive path. */
  allInclusive: boolean
  waterChargedSeparately: boolean
  electricityEmbeddedNetwork: boolean | null
  gasEmbeddedNetwork: boolean | null
  waterSeparatelyMeteredEfficientAttested: boolean
  services: Record<UtilityServiceId, ResolvedUtilityService>
  /** Human-readable summary for addendum / listing disclosure. */
  utilitiesDescription: string
  listingDisclosureLabels: string[]
}

export type PropertyUtilitiesPreflightOptions = {
  /** When true, listings without bills included are blocked (current product fork). */
  mandateAllInclusive: boolean
}

function service(
  id: UtilityServiceId,
  tenantMustPay: boolean,
  basis: UtilityChargeBasis,
  opts?: { apportionmentCost?: string | null; howMustBePaid?: string | null },
): ResolvedUtilityService {
  return {
    id,
    tenantMustPay,
    payer: tenantMustPay ? 'tenant' : 'lessor',
    basis,
    apportionmentCost: tenantMustPay ? (opts?.apportionmentCost ?? null) : null,
    howMustBePaid: tenantMustPay ? (opts?.howMustBePaid ?? null) : null,
  }
}

function buildListingDisclosureLabels(
  billsIncluded: boolean,
  waterChargedSeparately: boolean,
  electricityEmbeddedNetwork: boolean | null,
  gasEmbeddedNetwork: boolean | null,
): string[] {
  const labels: string[] = []
  if (billsIncluded) labels.push('Bills included')
  if (waterChargedSeparately) {
    labels.push('Water usage charged separately')
  } else if (billsIncluded) {
    labels.push('Water included in rent')
  }
  if (electricityEmbeddedNetwork === true) labels.push('Electricity via embedded network')
  if (gasEmbeddedNetwork === true) labels.push('Gas via embedded network')
  if (electricityEmbeddedNetwork === false && gasEmbeddedNetwork === false) {
    labels.push('Standard metered utilities')
  }
  return labels
}

function buildUtilitiesDescription(
  billsIncluded: boolean,
  waterChargedSeparately: boolean,
  electricityEmbeddedNetwork: boolean | null,
  gasEmbeddedNetwork: boolean | null,
): string {
  if (billsIncluded && !waterChargedSeparately) {
    return 'Electricity, gas and water usage are included in the rent. Internet and waste services as described on the property listing.'
  }
  const parts: string[] = []
  if (billsIncluded) {
    parts.push('Electricity and gas are included in the rent')
  }
  if (waterChargedSeparately) {
    parts.push('water usage is charged separately to the tenant on a metered basis')
  }
  if (electricityEmbeddedNetwork === true) parts.push('electricity is supplied via an embedded network')
  if (gasEmbeddedNetwork === true) parts.push('gas is supplied via an embedded network')
  if (parts.length === 0) {
    return 'Utilities and services as described on the property listing.'
  }
  return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `; ${parts.slice(1).join('; ')}` : ''}.`
}

/**
 * Canonical per-property utilities state. All consumers (listing display, form generators, addendum)
 * should read from this resolver rather than re-deriving from local assumptions.
 */
export function resolvePropertyUtilities(input: PropertyUtilitiesInput): PropertyUtilitiesResolution {
  const billsIncluded = propertyBillsIncluded(input.featureNames)
  const waterChargedSeparately = input.waterUsageChargedSeparately === true
  const allInclusive = billsIncluded && !waterChargedSeparately
  const waterAttested = propertyHasWaterSeparatelyMeteredAttestation({
    water_separately_metered_efficient_attested_at: input.waterSeparatelyMeteredEfficientAttestedAt,
  })

  const electricityTenantPays = billsIncluded ? false : true
  const gasTenantPays = billsIncluded ? false : true

  const electricityBasis: UtilityChargeBasis =
    input.electricityEmbeddedNetwork === true
      ? 'embedded_network'
      : billsIncluded
        ? 'included_in_rent'
        : 'metered_separate'

  const gasBasis: UtilityChargeBasis =
    input.gasEmbeddedNetwork === true
      ? 'embedded_network'
      : billsIncluded
        ? 'included_in_rent'
        : 'metered_separate'

  const waterBasis: UtilityChargeBasis = waterChargedSeparately ? 'metered_separate' : 'included_in_rent'

  const services: Record<UtilityServiceId, ResolvedUtilityService> = {
    electricity: service('electricity', electricityTenantPays, electricityBasis),
    gas: service('gas', gasTenantPays, gasBasis),
    water: service('water', waterChargedSeparately, waterBasis),
    phone: service('phone', false, 'included_in_rent'),
    other: service('other', false, 'included_in_rent'),
  }

  return {
    billsIncluded,
    allInclusive,
    waterChargedSeparately,
    electricityEmbeddedNetwork: input.electricityEmbeddedNetwork,
    gasEmbeddedNetwork: input.gasEmbeddedNetwork,
    waterSeparatelyMeteredEfficientAttested: waterAttested,
    services,
    utilitiesDescription: buildUtilitiesDescription(
      billsIncluded,
      waterChargedSeparately,
      input.electricityEmbeddedNetwork,
      input.gasEmbeddedNetwork,
    ),
    listingDisclosureLabels: buildListingDisclosureLabels(
      billsIncluded,
      waterChargedSeparately,
      input.electricityEmbeddedNetwork,
      input.gasEmbeddedNetwork,
    ),
  }
}

export function propertyUtilitiesInputFromPropertyRow(
  prop: Record<string, unknown> | null | undefined,
  featureNames: string[],
): PropertyUtilitiesInput {
  const p = prop ?? {}
  const readBool = (raw: unknown): boolean | null => (typeof raw === 'boolean' ? raw : null)
  return {
    featureNames,
    waterUsageChargedSeparately: readBool(p.water_usage_charged_separately),
    electricityEmbeddedNetwork: readBool(p.electricity_embedded_network),
    gasEmbeddedNetwork: readBool(p.gas_embedded_network),
    waterSeparatelyMeteredEfficientAttestedAt:
      typeof p.water_separately_metered_efficient_attested_at === 'string'
        ? p.water_separately_metered_efficient_attested_at
        : null,
  }
}

/** Fail-closed preflight messages when utilities facts cannot be asserted on prescribed forms. */
export function propertyUtilitiesPreflightMessages(
  input: PropertyUtilitiesInput,
  opts: PropertyUtilitiesPreflightOptions,
): string[] {
  const messages: string[] = []
  const billsIncluded = propertyBillsIncluded(input.featureNames)

  if (opts.mandateAllInclusive && !billsIncluded) {
    messages.push(
      'Listing must include bills (electricity and gas) in the rent. Per-service utility billing is not yet supported.',
    )
  }

  if (input.waterUsageChargedSeparately == null) {
    messages.push(
      'Specify whether water usage is charged separately to the tenant on the property listing.',
    )
  }

  if (
    input.waterUsageChargedSeparately === true &&
    !propertyHasWaterSeparatelyMeteredAttestation({
      water_separately_metered_efficient_attested_at: input.waterSeparatelyMeteredEfficientAttestedAt,
    })
  ) {
    messages.push(
      'Attest that the premises are separately metered and water-efficient before charging water usage to tenants.',
    )
  }

  return messages
}

export function propertyUtilitiesPreflightBlockedMessage(messages: string[]): string {
  if (messages.length === 0) {
    return 'Complete utilities details on the property listing before generating the tenancy agreement.'
  }
  return `Complete utilities on the property listing before generating the tenancy agreement. ${messages.join(' ')}`
}
