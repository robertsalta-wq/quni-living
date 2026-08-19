/** NSW T3 boarding-house compliance self-attestation (legal shield). Quni does not verify. */

export const NSW_T3_COMPLIANCE_WARRANTY_VERSION = 'nsw-t3-compliance-warranty-v1' as const

export const NSW_T3_COMPLIANCE_BLOCKED_MESSAGE =
  'Complete the NSW boarding-house compliance attestation before publishing or generating an occupancy agreement.'

export const NSW_T3_COMPLIANCE_SECTION_TITLE = 'NSW boarding-house compliance attestation'

export const NSW_T3_COMPLIANCE_INTRO =
  'Before this listing can go live or generate an occupancy agreement, declare the compliance items below. Quni records your declaration and does not verify registration, planning approval, or fire safety.'

export const NSW_T3_COMPLIANCE_DA_LABEL =
  'I declare this premises has development approval or other lawful planning entitlement for boarding-house use.'

export const NSW_T3_COMPLIANCE_AFSS_LABEL =
  'I declare a current Annual Fire Safety Statement (AFSS) is in place for this premises.'

export const NSW_T3_COMPLIANCE_HEAD_LESSOR_LABEL =
  'I declare I have written head-lessor (landlord) consent to sub-let or transfer this premises as a boarding house.'

export const NSW_T3_COMPLIANCE_WARRANTY_LABEL =
  'I affirm the declarations above are true. I understand Quni does not verify them and relies on this declaration. I am responsible for obtaining and maintaining compliance.'

export type NswT3ComplianceAttestationRow = {
  id: string
  property_id: string
  attested_by: string
  attested_at: string
  registration_number: string
  da_lawful_use_declared: boolean
  afss_current_declared: boolean
  afss_statement_date: string | null
  afss_expiry_date: string | null
  head_lessor_consent_declared: boolean | null
  warranty_version: string
  superseded_at: string | null
}

export type NswT3ComplianceFormState = {
  registrationNumber: string
  daDeclared: boolean
  afssDeclared: boolean
  afssStatementDate: string
  afssExpiryDate: string
  headLessorConsentDeclared: boolean
  warrantyAgreed: boolean
}

export function emptyNswT3ComplianceFormState(
  registrationNumber = '',
): NswT3ComplianceFormState {
  return {
    registrationNumber,
    daDeclared: false,
    afssDeclared: false,
    afssStatementDate: '',
    afssExpiryDate: '',
    headLessorConsentDeclared: false,
    warrantyAgreed: false,
  }
}

export function isNswT3ListingFields(args: {
  state: string | null | undefined
  propertyType: string | null | undefined
  isRegisteredRoomingHouse: boolean | null | undefined
}): boolean {
  return (
    (args.state ?? '').trim().toUpperCase() === 'NSW' &&
    args.propertyType === 'private_room_landlord_off_site' &&
    Boolean(args.isRegisteredRoomingHouse)
  )
}

/** Current (unsuperseded) row is complete for the listing's lister_role. */
export function isCompleteNswT3ComplianceAttestation(
  row: Pick<
    NswT3ComplianceAttestationRow,
    | 'registration_number'
    | 'da_lawful_use_declared'
    | 'afss_current_declared'
    | 'head_lessor_consent_declared'
    | 'warranty_version'
    | 'superseded_at'
  > | null | undefined,
  listerRole: 'owner' | 'head_tenant' | null | undefined,
): boolean {
  if (!row || row.superseded_at) return false
  if (!row.registration_number.trim()) return false
  if (!row.da_lawful_use_declared || !row.afss_current_declared) return false
  if (row.warranty_version !== NSW_T3_COMPLIANCE_WARRANTY_VERSION) return false
  if (listerRole === 'head_tenant' && row.head_lessor_consent_declared !== true) return false
  return true
}

export function nswT3ComplianceFormErrors(
  form: NswT3ComplianceFormState,
  listerRole: 'owner' | 'head_tenant',
): string | null {
  if (!form.registrationNumber.trim()) {
    return 'Enter the Fair Trading boarding-house registration number for this attestation.'
  }
  if (!form.daDeclared) {
    return 'Declare lawful planning entitlement (DA) for boarding-house use.'
  }
  if (!form.afssDeclared) {
    return 'Declare that a current Annual Fire Safety Statement is in place.'
  }
  if (listerRole === 'head_tenant' && !form.headLessorConsentDeclared) {
    return 'Declare you have written head-lessor consent to sub-let this boarding house.'
  }
  if (!form.warrantyAgreed) {
    return 'Accept the compliance warranty before continuing.'
  }
  return null
}

export function formStateFromNswT3Attestation(
  row: NswT3ComplianceAttestationRow,
  listerRole: 'owner' | 'head_tenant',
): NswT3ComplianceFormState {
  return {
    registrationNumber: row.registration_number,
    daDeclared: row.da_lawful_use_declared,
    afssDeclared: row.afss_current_declared,
    afssStatementDate: row.afss_statement_date?.slice(0, 10) ?? '',
    afssExpiryDate: row.afss_expiry_date?.slice(0, 10) ?? '',
    headLessorConsentDeclared:
      listerRole === 'head_tenant' ? row.head_lessor_consent_declared === true : false,
    warrantyAgreed: row.warranty_version === NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  }
}
