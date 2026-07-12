export const BOOKING_TERMS_PATCH_KEYS: ReadonlySet<string>

export function buildBookingTermsPatch(
  currentBooking: Record<string, unknown>,
  patch: Record<string, unknown>,
  context: {
    property: Record<string, unknown>
    primaryTenantEmail?: string | null
    landlordProfileId: string
    reason: string
  },
): Promise<{
  patch: Record<string, unknown>
  changes: Record<string, { from: unknown; to: unknown }>
  errors: string[]
  co_tenant_unverified?: boolean
}>
