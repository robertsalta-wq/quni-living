export const WATER_SEPARATELY_METERED_BLOCKED_MESSAGE =
  'You must confirm the premises are separately metered and water-efficient before charging water usage to tenants.'

export const WATER_SEPARATELY_METERED_ATTESTATION_LABEL =
  'The premises are individually or separately metered for water and meet water-efficiency standards'

export const WATER_SEPARATELY_METERED_ATTESTATION_INTRO =
  'By selecting water usage charged separately I certify that:'

export const WATER_SEPARATELY_METERED_ATTESTATION_BULLETS = [
  'The rental premises (or the part let to the tenant) are individually metered or have a separate water meter; and',
  'All showerheads and internal cold-water taps (other than bathtub taps and taps for appliances) meet the water-efficiency standards required to pass water-usage charges to the tenant under the applicable residential tenancies law.',
] as const

export const WATER_SEPARATELY_METERED_ATTESTATION_FOOTER =
  'I understand this representation may appear on the prescribed tenancy agreement and Quni may remove or block the listing if it cannot be substantiated.'

export function propertyHasWaterSeparatelyMeteredAttestation(
  property: { water_separately_metered_efficient_attested_at?: string | null } | null | undefined,
): boolean {
  return Boolean(property?.water_separately_metered_efficient_attested_at)
}

export function waterSeparatelyMeteredAttestationPatch(args: {
  agreed: boolean
  existingAttestedAt: string | null
}): { water_separately_metered_efficient_attested_at: string } | Record<string, never> {
  if (args.existingAttestedAt || !args.agreed) return {}
  return { water_separately_metered_efficient_attested_at: new Date().toISOString() }
}
