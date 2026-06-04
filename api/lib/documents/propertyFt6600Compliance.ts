/**
 * NSW FT6600 schedule compliance values stored on properties (landlord-entered).
 */
import type { NswFt6600PropertyCompliance } from '../../documents/rtaTypes.js'
import { featureNamesFromPropertyRow } from '../../../src/lib/propertyFeatureSignals.js'

export type { NswFt6600PropertyCompliance }

/** Human-readable labels for accept-gate / validation messages. */
export const NSW_FT6600_COMPLIANCE_FIELD_LABELS = {
  smoke_alarm_type: 'Smoke alarm type (hardwired or battery)',
  smoke_alarm_battery_tenant_replaceable: 'Tenant may replace smoke alarm batteries',
  smoke_alarm_battery_type: 'Smoke alarm battery type',
  smoke_alarm_backup_tenant_replaceable: 'Tenant may replace hardwired smoke alarm backup batteries',
  smoke_alarm_backup_battery_type: 'Hardwired smoke alarm backup battery type',
  strata_oc_responsible_for_alarms: 'Owners corporation responsible for smoke alarms',
  water_usage_charged_separately: 'Water usage charged separately',
  electricity_embedded_network: 'Electricity supplied via embedded network',
  gas_embedded_network: 'Gas supplied via embedded network',
  strata_bylaws_applicable: 'Strata or community scheme by-laws apply',
} as const

export type NswFt6600ComplianceFieldKey = keyof typeof NSW_FT6600_COMPLIANCE_FIELD_LABELS

function readBool(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw
  return null
}

function readText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

function readSmokeAlarmType(raw: unknown): 'hardwired' | 'battery' | null {
  if (raw === 'hardwired' || raw === 'battery') return raw
  return null
}

/** Map a properties row (snake_case) to FT6600 compliance props. */
export function nswFt6600ComplianceFromPropertyRow(
  prop: Record<string, unknown> | null | undefined,
): NswFt6600PropertyCompliance {
  const p = prop ?? {}
  return {
    smokeAlarmType: readSmokeAlarmType(p.smoke_alarm_type),
    smokeAlarmBatteryTenantReplaceable: readBool(p.smoke_alarm_battery_tenant_replaceable),
    smokeAlarmBatteryType: readText(p.smoke_alarm_battery_type),
    smokeAlarmBackupTenantReplaceable: readBool(p.smoke_alarm_backup_tenant_replaceable),
    smokeAlarmBackupBatteryType: readText(p.smoke_alarm_backup_battery_type),
    strataOcResponsibleForAlarms: readBool(p.strata_oc_responsible_for_alarms),
    waterUsageChargedSeparately: readBool(p.water_usage_charged_separately),
    electricityEmbeddedNetwork: readBool(p.electricity_embedded_network),
    gasEmbeddedNetwork: readBool(p.gas_embedded_network),
    strataBylawsApplicable: readBool(p.strata_bylaws_applicable),
  }
}

/**
 * Resolve water-usage checkbox when the property column is unset (legacy listings).
 * Bills-included listings imply water is not charged separately.
 */
export function resolveWaterUsageChargedSeparately(
  compliance: NswFt6600PropertyCompliance | null | undefined,
  billsIncluded: boolean | null | undefined,
): boolean | null {
  if (!compliance) return null
  if (compliance.waterUsageChargedSeparately != null) {
    return compliance.waterUsageChargedSeparately
  }
  if (billsIncluded == null) return null
  return billsIncluded !== true
}

/**
 * Premises inclusions line for FT6600 schedule — derived from existing listing inclusions/features
 * (furnished, linen, cleaning, property_features); no separate DB column.
 */
export function nswFt6600PremisesInclusionsFromPropertyRow(
  prop: Record<string, unknown> | null | undefined,
): string[] {
  const p = prop ?? {}
  const parts: string[] = []

  if (typeof p.room_type === 'string' && p.room_type.trim()) {
    parts.push(`Room: ${p.room_type.trim()}`)
  }
  if (typeof p.furnished === 'boolean') {
    parts.push(p.furnished ? 'Furnished' : 'Unfurnished')
  }
  if (p.linen_supplied === true) parts.push('Linen supplied')
  if (p.weekly_cleaning_service === true) parts.push('Weekly cleaning service')

  const featureNames = featureNamesFromPropertyRow(
    p as Parameters<typeof featureNamesFromPropertyRow>[0],
  )
  const seen = new Set(parts.map((s) => s.toLowerCase()))
  for (const raw of featureNames) {
    const label = raw.replace(/\b\w/g, (c) => c.toUpperCase())
    const key = label.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      parts.push(label)
    }
  }

  return parts
}

/**
 * Returns human-readable labels for FT6600 compliance fields still null on the property row.
 * `isStrataScheme` mirrors the landlord form: when false, strata OC is not required.
 */
export function missingNswFt6600ComplianceFieldLabels(
  prop: Record<string, unknown> | null | undefined,
  opts?: { isStrataScheme?: boolean | null },
): string[] {
  const compliance = nswFt6600ComplianceFromPropertyRow(prop)
  const missing: string[] = []

  if (!compliance.smokeAlarmType) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_type)
  }

  const isStrata =
    opts?.isStrataScheme ??
    (compliance.strataOcResponsibleForAlarms != null || compliance.strataBylawsApplicable === true)
  const ocSkipsTenantReplaceability =
    isStrata && compliance.strataOcResponsibleForAlarms === true

  if (!ocSkipsTenantReplaceability) {
    if (compliance.smokeAlarmType === 'battery') {
      if (compliance.smokeAlarmBatteryTenantReplaceable == null) {
        missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_battery_tenant_replaceable)
      } else if (
        compliance.smokeAlarmBatteryTenantReplaceable === true &&
        !compliance.smokeAlarmBatteryType
      ) {
        missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_battery_type)
      }
    }

    if (compliance.smokeAlarmType === 'hardwired') {
      if (compliance.smokeAlarmBackupTenantReplaceable == null) {
        missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_backup_tenant_replaceable)
      } else if (
        compliance.smokeAlarmBackupTenantReplaceable === true &&
        !compliance.smokeAlarmBackupBatteryType
      ) {
        missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_backup_battery_type)
      }
    }
  }

  if (isStrata && compliance.strataOcResponsibleForAlarms == null) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.strata_oc_responsible_for_alarms)
  }

  if (compliance.waterUsageChargedSeparately == null) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.water_usage_charged_separately)
  }
  if (compliance.electricityEmbeddedNetwork == null) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.electricity_embedded_network)
  }
  if (compliance.gasEmbeddedNetwork == null) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.gas_embedded_network)
  }
  if (compliance.strataBylawsApplicable == null) {
    missing.push(NSW_FT6600_COMPLIANCE_FIELD_LABELS.strata_bylaws_applicable)
  }

  return missing
}

export function nswFt6600ComplianceCompleteForProperty(
  prop: Record<string, unknown> | null | undefined,
  opts?: { isStrataScheme?: boolean | null },
): boolean {
  return missingNswFt6600ComplianceFieldLabels(prop, opts).length === 0
}

export function nswFt6600ComplianceBlockedMessage(missingLabels: string[]): string {
  if (missingLabels.length === 0) {
    return 'Complete smoke alarm and FT6600 compliance details on the property listing before accepting or generating the lease.'
  }
  return `Complete smoke alarm & compliance (NSW) on the property listing before accepting or generating the lease. Missing: ${missingLabels.join('; ')}.`
}
