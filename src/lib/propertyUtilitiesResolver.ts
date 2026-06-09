import { propertyBillsIncluded } from './propertyFeatureSignals.js'
import { propertyHasWaterSeparatelyMeteredAttestation } from './waterSeparatelyMeteredAttestation.js'
import {
  CAPTURABLE_UTILITY_SERVICE_IDS,
  UTILITY_SERVICE_DISPLAY_LABELS,
  formatApportionmentPercentForItem14,
  propertyUtilitiesServicesFromPropertyRow,
  type CapturableUtilityServiceId,
  type PropertyUtilitiesServicesStored,
  type StoredUtilityServiceCapture,
} from './propertyUtilitiesServices.js'

export type UtilityServiceId = 'electricity' | 'gas' | 'water' | 'phone' | 'other'

export type UtilityPayer = 'tenant' | 'lessor'

/** How a utility charge is determined. */
export type UtilityChargeBasis =
  | 'included_in_rent'
  | 'metered_separate'
  | 'apportionment'
  | 'embedded_network'
  | 'lessor_pays'

export type ResolvedUtilityService = {
  id: UtilityServiceId
  /** Prescribed-form "tenant must pay" checkbox (Items 13.1 / FT6600 equivalents). */
  tenantMustPay: boolean
  payer: UtilityPayer
  basis: UtilityChargeBasis
  individuallyMetered: boolean | null
  /** Stored apportionment share (1–100) when tenant pays and not individually metered. */
  apportionmentPercent: number | null
  /** Form 18a Item 14 display — "{n}%". */
  apportionmentCost: string | null
  /** Form 18a Item 15 — when tenantMustPay. */
  howMustBePaid: string | null
}

export type PropertyUtilitiesInput = {
  featureNames: string[]
  waterUsageChargedSeparately: boolean | null
  electricityEmbeddedNetwork: boolean | null
  gasEmbeddedNetwork: boolean | null
  waterSeparatelyMeteredEfficientAttestedAt: string | null
  utilitiesServices: PropertyUtilitiesServicesStored | null
}

export type PropertyUtilitiesResolution = {
  billsIncluded: boolean
  /** Bills included with no separate water charge. */
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

function service(
  id: UtilityServiceId,
  tenantMustPay: boolean,
  basis: UtilityChargeBasis,
  opts?: {
    individuallyMetered?: boolean | null
    apportionmentPercent?: number | null
    apportionmentCost?: string | null
    howMustBePaid?: string | null
  },
): ResolvedUtilityService {
  return {
    id,
    tenantMustPay,
    payer: tenantMustPay ? 'tenant' : 'lessor',
    basis,
    individuallyMetered: opts?.individuallyMetered ?? null,
    apportionmentPercent: tenantMustPay ? (opts?.apportionmentPercent ?? null) : null,
    apportionmentCost: tenantMustPay ? (opts?.apportionmentCost ?? null) : null,
    howMustBePaid: tenantMustPay ? (opts?.howMustBePaid ?? null) : null,
  }
}

function resolveCapturedService(
  id: CapturableUtilityServiceId,
  capture: StoredUtilityServiceCapture | null | undefined,
  embeddedNetwork: boolean | null,
): ResolvedUtilityService {
  const tenantPays = capture?.tenant_pays === true
  if (!tenantPays) {
    return service(id, false, 'lessor_pays')
  }

  const individuallyMetered = capture?.individually_metered === true
  const basis: UtilityChargeBasis = embeddedNetwork === true
    ? 'embedded_network'
    : individuallyMetered
      ? 'metered_separate'
      : 'apportionment'

  const apportionmentPercent =
    !individuallyMetered && capture?.apportionment_percent != null
      ? capture.apportionment_percent
      : null

  return service(id, true, basis, {
    individuallyMetered: capture?.individually_metered ?? null,
    apportionmentPercent,
    apportionmentCost:
      apportionmentPercent != null ? formatApportionmentPercentForItem14(apportionmentPercent) : null,
    howMustBePaid: capture?.how_must_be_paid ?? null,
  })
}

function serviceDisclosureLabel(resolved: ResolvedUtilityService): string | null {
  const name = UTILITY_SERVICE_DISPLAY_LABELS[resolved.id as CapturableUtilityServiceId]
  if (!name) return null
  if (!resolved.tenantMustPay) return `${name} included in rent (lessor pays)`
  if (resolved.individuallyMetered === true) return `Tenant pays ${name.toLowerCase()} (individually metered)`
  if (resolved.apportionmentPercent != null) {
    return `Tenant pays ${formatApportionmentPercentForItem14(resolved.apportionmentPercent)} of ${name.toLowerCase()}`
  }
  return `Tenant pays ${name.toLowerCase()}`
}

function buildListingDisclosureLabels(resolution: PropertyUtilitiesResolution): string[] {
  const labels: string[] = []
  if (resolution.billsIncluded) labels.push('Bills included')
  if (resolution.waterChargedSeparately) {
    labels.push('Water usage charged separately')
  } else if (resolution.billsIncluded) {
    labels.push('Water included in rent')
  }

  if (!resolution.billsIncluded) {
    for (const id of CAPTURABLE_UTILITY_SERVICE_IDS) {
      const line = serviceDisclosureLabel(resolution.services[id])
      if (line) labels.push(line)
    }
  } else if (resolution.electricityEmbeddedNetwork === true) {
    labels.push('Electricity via embedded network')
  } else if (resolution.gasEmbeddedNetwork === true) {
    labels.push('Gas via embedded network')
  }

  return labels
}

function buildUtilitiesDescription(resolution: PropertyUtilitiesResolution): string {
  if (resolution.allInclusive) {
    return 'Electricity, gas and water usage are included in the rent. Internet and waste services as described on the property listing.'
  }

  const parts: string[] = []
  if (resolution.billsIncluded) {
    parts.push('Electricity and gas are included in the rent')
  } else {
    for (const id of CAPTURABLE_UTILITY_SERVICE_IDS) {
      const line = serviceDisclosureLabel(resolution.services[id])
      if (line) parts.push(line)
    }
  }
  if (resolution.waterChargedSeparately) {
    parts.push('water usage is charged separately to the tenant on a metered basis')
  }
  if (parts.length === 0) {
    return 'Utilities and services as described on the property listing.'
  }
  return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `. ${parts.slice(1).join('. ')}` : ''}.`
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

  const stored = input.utilitiesServices

  const electricity = billsIncluded
    ? service(
        'electricity',
        false,
        input.electricityEmbeddedNetwork === true ? 'embedded_network' : 'included_in_rent',
      )
    : resolveCapturedService('electricity', stored?.electricity, input.electricityEmbeddedNetwork)

  const gas = billsIncluded
    ? service('gas', false, input.gasEmbeddedNetwork === true ? 'embedded_network' : 'included_in_rent')
    : resolveCapturedService('gas', stored?.gas, input.gasEmbeddedNetwork)

  const waterBasis: UtilityChargeBasis = waterChargedSeparately ? 'metered_separate' : 'included_in_rent'

  const services: Record<UtilityServiceId, ResolvedUtilityService> = {
    electricity,
    gas,
    water: service('water', waterChargedSeparately, waterBasis),
    phone: service('phone', false, 'included_in_rent'),
    other: service('other', false, 'included_in_rent'),
  }

  const resolution: PropertyUtilitiesResolution = {
    billsIncluded,
    allInclusive,
    waterChargedSeparately,
    electricityEmbeddedNetwork: input.electricityEmbeddedNetwork,
    gasEmbeddedNetwork: input.gasEmbeddedNetwork,
    waterSeparatelyMeteredEfficientAttested: waterAttested,
    services,
    utilitiesDescription: '',
    listingDisclosureLabels: [],
  }

  resolution.utilitiesDescription = buildUtilitiesDescription(resolution)
  resolution.listingDisclosureLabels = buildListingDisclosureLabels(resolution)
  return resolution
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
    utilitiesServices: propertyUtilitiesServicesFromPropertyRow(p),
  }
}

function missingCaptureMessages(
  id: CapturableUtilityServiceId,
  capture: StoredUtilityServiceCapture | null | undefined,
): string[] {
  const label = UTILITY_SERVICE_DISPLAY_LABELS[id]
  const messages: string[] = []
  if (!capture || capture.tenant_pays == null) {
    messages.push(`Specify whether the tenant pays for ${label.toLowerCase()}.`)
    return messages
  }
  if (capture.tenant_pays !== true) return messages

  if (capture.individually_metered == null) {
    messages.push(`Specify whether ${label.toLowerCase()} is individually metered.`)
    return messages
  }
  if (capture.individually_metered === false && capture.apportionment_percent == null) {
    messages.push(
      `Enter the percentage of the total ${label.toLowerCase()} charge the tenant must pay (Form 18a Item 14).`,
    )
  }
  if (!capture.how_must_be_paid?.trim()) {
    messages.push(`Describe how the tenant pays for ${label.toLowerCase()} (Form 18a Item 15).`)
  }
  return messages
}

/** Fail-closed preflight when utilities facts cannot be asserted on prescribed forms. */
export function propertyUtilitiesPreflightMessages(input: PropertyUtilitiesInput): string[] {
  const messages: string[] = []
  const billsIncluded = propertyBillsIncluded(input.featureNames)

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

  if (!billsIncluded) {
    for (const id of CAPTURABLE_UTILITY_SERVICE_IDS) {
      messages.push(...missingCaptureMessages(id, input.utilitiesServices?.[id]))
    }
  }

  return messages
}

export function propertyUtilitiesPreflightBlockedMessage(messages: string[]): string {
  if (messages.length === 0) {
    return 'Complete utilities details on the property listing before generating the tenancy agreement.'
  }
  return `Complete utilities on the property listing before generating the tenancy agreement. ${messages.join(' ')}`
}
