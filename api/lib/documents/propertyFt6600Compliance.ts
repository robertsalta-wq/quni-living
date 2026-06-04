/**
 * NSW FT6600 schedule compliance values stored on properties (landlord-entered).
 */
import type { NswFt6600PropertyCompliance } from '../../documents/rtaTypes.js'

export type { NswFt6600PropertyCompliance }

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
  compliance: NswFt6600PropertyCompliance,
  billsIncluded: boolean | null | undefined,
): boolean {
  if (compliance.waterUsageChargedSeparately != null) {
    return compliance.waterUsageChargedSeparately
  }
  return billsIncluded !== true
}
