import { managedMatrixKeyForProperty } from './matrix.js'
import { nswServiceTierAvailability } from './nsw.js'
import { qldServiceTierAvailability } from './qld.js'
import { vicServiceTierAvailability } from './vic.js'
import type {
  PropertyTier,
  ResolveServiceTierOptions,
  ServiceTierAvailability,
  ServiceTierResolverState,
} from './types.js'

export type {
  PropertyTier,
  ResolveServiceTierOptions,
  ServiceTierAvailability,
  ServiceTierAvailabilityStatus,
  ServiceTierResolverState,
} from './types.js'

export {
  MATRIX_STATE_CODES,
  buildManagedOverridesMap,
  managedMatrixKey,
  managedMatrixKeyForProperty,
  matrixStateCodeForPropertyState,
  type ManagedMatrixOverride,
  type ManagedOverridesMap,
  type MatrixStateCode,
  type ServiceTierMatrixRow,
} from './matrix.js'

const MANAGED_COMING_SOON_NOTES = 'Quni Managed is coming within the next month.'

function applyManagedStateMatrix(
  availability: ServiceTierAvailability,
  state: string,
  propertyTier: PropertyTier,
  options?: ResolveServiceTierOptions,
): ServiceTierAvailability {
  const key = managedMatrixKeyForProperty(state, propertyTier)
  const override = options?.managedOverrides?.[key]
  if (!override) return availability
  return {
    listing: availability.listing,
    managed: override.managed,
    notes: override.notes ?? availability.notes,
  }
}

function applyManagedGlobalGate(
  availability: ServiceTierAvailability,
  options?: ResolveServiceTierOptions,
): ServiceTierAvailability {
  if (options?.managedGloballyEnabled === false) {
    return {
      listing: availability.listing,
      managed: 'gated',
      notes: MANAGED_COMING_SOON_NOTES,
    }
  }
  return availability
}

export function resolveServiceTierAvailability(
  state: string,
  propertyTier: PropertyTier,
  options?: ResolveServiceTierOptions,
): ServiceTierAvailability {
  const normalized = state.trim().toUpperCase() as ServiceTierResolverState
  let base: ServiceTierAvailability
  if (normalized === 'NSW') base = nswServiceTierAvailability(propertyTier)
  else if (normalized === 'QLD') base = qldServiceTierAvailability(propertyTier)
  else if (normalized === 'VIC') base = vicServiceTierAvailability(propertyTier)
  else base = { listing: 'available', managed: 'unsupported' }
  const withMatrix = applyManagedStateMatrix(base, state, propertyTier, options)
  return applyManagedGlobalGate(withMatrix, options)
}
