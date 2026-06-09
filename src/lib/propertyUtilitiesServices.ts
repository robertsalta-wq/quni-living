/** Stored shape for `properties.utilities_services` (snake_case keys in JSONB). */

export type StoredUtilityServiceCapture = {
  tenant_pays: boolean | null
  individually_metered: boolean | null
  /** Tenant's share of the total charge (Form 18a Item 14), 1–100 with at most one decimal. */
  apportionment_percent: number | null
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
    apportionment_percent: null,
    how_must_be_paid: null,
  }
}

export function emptyPropertyUtilitiesServicesStored(): PropertyUtilitiesServicesStored {
  return {
    electricity: emptyStoredUtilityServiceCapture(),
    gas: emptyStoredUtilityServiceCapture(),
  }
}

/** Normalise to one decimal place within 1–100, or null if invalid. */
export function normaliseApportionmentPercent(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw < 1 || raw > 100) return null
  return Math.round(raw * 10) / 10
}

/** Parse landlord form / API input (1–100, at most one decimal). */
export function parseApportionmentPercentInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d{1,3}(\.\d)?$/.test(trimmed)) return null
  return normaliseApportionmentPercent(Number(trimmed))
}

/** Form 18a Item 14 display value (clause 16(c) percentage of total charge). */
export function formatApportionmentPercentForItem14(percent: number): string {
  const n = normaliseApportionmentPercent(percent)
  if (n == null) return ''
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
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
    apportionment_percent: normaliseApportionmentPercent(o.apportionment_percent),
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
