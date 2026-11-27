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

export function parseCoTenantFromBooking(raw: unknown): {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  accepts_electronic_service: boolean | null
} | null

export function occupancyCoResidentNameFromBooking(
  booking: { co_tenant?: unknown } | null | undefined,
): string | null

export function maxOccupantsPermittedForLease(booking: Record<string, unknown>): number
