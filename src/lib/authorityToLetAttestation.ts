export const AUTHORITY_TO_LET_BLOCKED_MESSAGE =
  'You must confirm you have authority to let this property before publishing.'

export const AUTHORITY_TO_LET_ATTESTATION_LABEL =
  'I have authority to let this property (owner, or tenant with written consent)'

export const AUTHORITY_TO_LET_ATTESTATION_INTRO = 'By listing this property I certify that:'

export const AUTHORITY_TO_LET_ATTESTATION_BULLETS = [
  'I am the legal owner of this property, or I am a lawful tenant with my landlord\'s written consent to sub-let or transfer it under the applicable residential tenancies law; and',
  'I can provide proof of ownership or that written consent to Quni on request.',
] as const

export const AUTHORITY_TO_LET_ATTESTATION_FOOTER =
  'I understand Quni may remove this listing if valid proof of authority is not provided on request.'

export function propertyHasAuthorityToLetAttestation(
  property: { authority_to_let_attested_at?: string | null } | null | undefined,
): boolean {
  return Boolean(property?.authority_to_let_attested_at)
}

export function authorityToLetAttestationPatch(args: {
  agreed: boolean
  existingAttestedAt: string | null
}): { authority_to_let_attested_at: string } | Record<string, never> {
  if (args.existingAttestedAt || !args.agreed) return {}
  return { authority_to_let_attested_at: new Date().toISOString() }
}
