export function bookingAllowsTenancyDocumentGeneration(booking: {
  status?: string | null
  service_tier_final?: string | null
}): boolean

export function isListingPreviewGeneration(
  deferSigning: boolean,
  booking: { status?: string | null; service_tier_final?: string | null },
): boolean
