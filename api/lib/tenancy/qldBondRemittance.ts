/** QLD Listing only: landlord-stated bond payment preference (steer, not block). */
export type QldBondRemittancePreference = 'landlord_collects_remits' | 'tenant_choice'

export const QLD_BOND_REMITTANCE_OPTIONS: {
  value: QldBondRemittancePreference
  label: string
  description: string
}[] = [
  {
    value: 'landlord_collects_remits',
    label: 'I collect and lodge with the RTA',
    description:
      'The renter pays bond to you and you lodge it with the RTA on their behalf within 10 days. They can still lodge directly with the RTA if they prefer.',
  },
  {
    value: 'tenant_choice',
    label: 'Renter chooses',
    description:
      'The renter can lodge directly with the RTA (Web Services / QDI or Form 2), or pay you to lodge on their behalf. You must offer the RTA route first.',
  },
]

export function parseQldBondRemittancePreference(raw: unknown): QldBondRemittancePreference | null {
  if (raw === 'landlord_collects_remits' || raw === 'tenant_choice') return raw
  return null
}

/** Default when unset — preserves existing tenant-first guidance. */
export function effectiveQldBondRemittancePreference(
  raw: QldBondRemittancePreference | null | undefined,
): QldBondRemittancePreference {
  return raw ?? 'tenant_choice'
}

export function isQldSchemeListingProperty(state: string | null | undefined): boolean {
  return (state ?? '').trim().toUpperCase() === 'QLD'
}

export type ListingBondPaymentOptions = {
  qldBondRemittancePreference?: QldBondRemittancePreference | null
}
