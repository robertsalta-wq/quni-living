import {
  boolColToTri,
  triToBool,
  type TriState,
} from '../components/landlord/LandlordPropertyFt6600ComplianceFields'
import {
  type PropertyUtilitiesServicesStored,
  type StoredUtilityServiceCapture,
} from './propertyUtilitiesServices'

export type PerServiceUtilitiesFormState = {
  tenantPays: TriState
  individuallyMetered: TriState
  apportionmentMethod: string
  howMustBePaid: string
}

export type LandlordPropertyUtilitiesFormState = {
  waterUsageChargedSeparately: TriState
  waterSeparatelyMeteredAgreed: boolean
  electricity: PerServiceUtilitiesFormState
  gas: PerServiceUtilitiesFormState
}

function emptyPerServiceFormState(): PerServiceUtilitiesFormState {
  return {
    tenantPays: '',
    individuallyMetered: '',
    apportionmentMethod: '',
    howMustBePaid: '',
  }
}

export function emptyLandlordPropertyUtilitiesFormState(): LandlordPropertyUtilitiesFormState {
  return {
    waterUsageChargedSeparately: '',
    waterSeparatelyMeteredAgreed: false,
    electricity: emptyPerServiceFormState(),
    gas: emptyPerServiceFormState(),
  }
}

function perServiceFormFromStored(
  capture: StoredUtilityServiceCapture | null | undefined,
): PerServiceUtilitiesFormState {
  if (!capture) return emptyPerServiceFormState()
  return {
    tenantPays: boolColToTri(capture.tenant_pays),
    individuallyMetered: boolColToTri(capture.individually_metered),
    apportionmentMethod: capture.apportionment_method ?? '',
    howMustBePaid: capture.how_must_be_paid ?? '',
  }
}

export function landlordPropertyUtilitiesFormStateFromProperty(prop: {
  water_usage_charged_separately?: boolean | null
  water_separately_metered_efficient_attested_at?: string | null
  utilities_services?: unknown
}): LandlordPropertyUtilitiesFormState {
  const attested = Boolean(prop.water_separately_metered_efficient_attested_at)
  const stored = prop.utilities_services as PropertyUtilitiesServicesStored | null | undefined
  return {
    waterUsageChargedSeparately: boolColToTri(prop.water_usage_charged_separately),
    waterSeparatelyMeteredAgreed: attested,
    electricity: perServiceFormFromStored(stored?.electricity),
    gas: perServiceFormFromStored(stored?.gas),
  }
}

function storedFromPerServiceForm(form: PerServiceUtilitiesFormState): StoredUtilityServiceCapture {
  const tenantPays = triToBool(form.tenantPays)
  if (tenantPays !== true) {
    return { tenant_pays: tenantPays, individually_metered: null, apportionment_method: null, how_must_be_paid: null }
  }
  const individuallyMetered = triToBool(form.individuallyMetered)
  return {
    tenant_pays: true,
    individually_metered: individuallyMetered,
    apportionment_method:
      individuallyMetered === false && form.apportionmentMethod.trim()
        ? form.apportionmentMethod.trim()
        : null,
    how_must_be_paid: form.howMustBePaid.trim() ? form.howMustBePaid.trim() : null,
  }
}

export function landlordPropertyUtilitiesColumnsFromFormState(
  form: LandlordPropertyUtilitiesFormState,
  opts: { billsIncluded: boolean },
): {
  water_usage_charged_separately: boolean | null
  utilities_services: PropertyUtilitiesServicesStored | null
} {
  if (opts.billsIncluded) {
    return {
      water_usage_charged_separately: triToBool(form.waterUsageChargedSeparately),
      utilities_services: null,
    }
  }
  return {
    water_usage_charged_separately: triToBool(form.waterUsageChargedSeparately),
    utilities_services: {
      electricity: storedFromPerServiceForm(form.electricity),
      gas: storedFromPerServiceForm(form.gas),
    },
  }
}
