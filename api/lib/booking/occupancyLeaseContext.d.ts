export type OccupancyLeaseFields = {
  additionalTenantNames: string[]
  maxOccupantsPermitted: number
  specialConditions: string[]
}

export class MissingBookingOccupantCountError extends Error {
  name: 'MissingBookingOccupantCountError'
}

export function occupancyLeaseFieldsFromBooking(
  booking: Record<string, unknown>,
  property?: Record<string, unknown> | null,
): OccupancyLeaseFields

export function occupancyCoResidentNameFromBooking(
  booking: { co_tenant?: unknown } | null | undefined,
): string | null

export function maxOccupantsPermittedForLease(booking: Record<string, unknown>): number
