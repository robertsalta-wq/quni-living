/** Stored shape for `properties.utilities_services` (snake_case keys in JSONB). */

export type StoredUtilityServiceCapture = {
  tenant_pays: boolean | null
  individually_metered: boolean | null
  apportionment_method: string | null
  how_must_be_paid: string | null
}

export type PropertyUtilitiesServicesStored = {
  electricity?: StoredUtilityServiceCapture
  gas?: StoredUtilityServiceCapture
}

export type CapturableUtilityServiceId = 'electricity' | 'gas'

export const CAPTURABLE_UTILITY_SERVICE_IDS: CapturableUtilityServiceId[] = ['electricity', 'gas']

export const UTILITY_SERVICE_DISPLAY_LABELS: Record<CapturableUtilityServiceId, string> = {
  electricity: 'Electricity',
  gas: 'Gas',
}

export function emptyStoredUtilityServiceCapture(): StoredUtilityServiceCapture {
  return {
    tenant_pays: null,
    individually_metered: null,
    apportionment_method: null,
    how_must_be_paid: null,
  }
}

export function emptyPropertyUtilitiesServicesStored(): PropertyUtilitiesServicesStored {
  return {
    electricity: emptyStoredUtilityServiceCapture(),
    gas: emptyStoredUtilityServiceCapture(),
  }
}

function readStoredService(raw: unknown): StoredUtilityServiceCapture | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const readBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)
  const readText = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  return {
    tenant_pays: readBool(o.tenant_pays),
    individually_metered: readBool(o.individually_metered),
    apportionment_method: readText(o.apportionment_method),
    how_must_be_paid: readText(o.how_must_be_paid),
  }
}

export function parsePropertyUtilitiesServicesStored(
  raw: unknown,
): PropertyUtilitiesServicesStored | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const electricity = readStoredService(o.electricity)
  const gas = readStoredService(o.gas)
  if (!electricity && !gas) return null
  return { ...(electricity ? { electricity } : {}), ...(gas ? { gas } : {}) }
}

export function propertyUtilitiesServicesFromPropertyRow(
  prop: Record<string, unknown> | null | undefined,
): PropertyUtilitiesServicesStored | null {
  return parsePropertyUtilitiesServicesStored(prop?.utilities_services)
}
