import type { PropertyTier, ServiceTierAvailabilityStatus } from './types.js'

export const MATRIX_STATE_CODES = ['NSW', 'QLD', 'VIC', 'DEFAULT'] as const
export type MatrixStateCode = (typeof MATRIX_STATE_CODES)[number]

export type ServiceTierMatrixRow = {
  state_code: MatrixStateCode
  property_tier: PropertyTier
  managed_status: ServiceTierAvailabilityStatus
  notes: string | null
}

export type ManagedMatrixOverride = {
  managed: ServiceTierAvailabilityStatus
  notes?: string
}

export type ManagedOverridesMap = Partial<Record<string, ManagedMatrixOverride>>

/** Maps a property state (e.g. WA) to a matrix row bucket. */
export function matrixStateCodeForPropertyState(state: string): MatrixStateCode {
  const normalized = state.trim().toUpperCase()
  if (normalized === 'NSW' || normalized === 'QLD' || normalized === 'VIC') return normalized
  return 'DEFAULT'
}

export function managedMatrixKey(stateCode: MatrixStateCode, tier: PropertyTier): string {
  return `${stateCode}:${tier}`
}

export function managedMatrixKeyForProperty(state: string, tier: PropertyTier): string {
  return managedMatrixKey(matrixStateCodeForPropertyState(state), tier)
}

export function buildManagedOverridesMap(
  rows: ReadonlyArray<{
    state_code: string
    property_tier: string
    managed_status: string
    notes: string | null
  }>,
): ManagedOverridesMap {
  const out: ManagedOverridesMap = {}
  for (const row of rows) {
    const stateCode = row.state_code as MatrixStateCode
    const tier = row.property_tier as PropertyTier
    if (!MATRIX_STATE_CODES.includes(stateCode)) continue
    if (tier !== 't1' && tier !== 't2' && tier !== 't3') continue
    const status = row.managed_status as ServiceTierAvailabilityStatus
    if (status !== 'available' && status !== 'gated' && status !== 'unsupported') continue
    const key = managedMatrixKey(stateCode, tier)
    const notes = row.notes?.trim()
    out[key] = notes ? { managed: status, notes } : { managed: status }
  }
  return out
}
