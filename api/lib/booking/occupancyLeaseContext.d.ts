export type OccupancyLeaseFields = {
  additionalTenantNames: string[]
  maxOccupantsPermitted: number
  specialConditions: string[]
}

export function occupancyLeaseFieldsFromBooking(
  booking: Record<string, unknown>,
  property?: Record<string, unknown> | null,
): OccupancyLeaseFields

export function maxOccupantsPermittedForLease(
  booking: Record<string, unknown>,
  property?: Record<string, unknown> | null,
): number
