import { describe, expect, it } from 'vitest'
import {
  NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  emptyNswT3ComplianceFormState,
  formStateFromNswT3Attestation,
  isCompleteNswT3ComplianceAttestation,
  isNswT3ListingFields,
  nswT3ComplianceFormErrors,
  type NswT3ComplianceAttestationRow,
} from './nswT3ComplianceAttestation'

const baseRow = (): NswT3ComplianceAttestationRow => ({
  id: 'a1',
  property_id: 'p1',
  attested_by: 'u1',
  attested_at: '2026-08-19T00:00:00.000Z',
  registration_number: 'BH-123',
  da_lawful_use_declared: true,
  afss_current_declared: true,
  afss_statement_date: null,
  afss_expiry_date: null,
  head_lessor_consent_declared: null,
  warranty_version: NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  superseded_at: null,
})

describe('nswT3ComplianceAttestation', () => {
  it('detects NSW T3 listing fields', () => {
    expect(
      isNswT3ListingFields({
        state: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: true,
      }),
    ).toBe(true)
    expect(
      isNswT3ListingFields({
        state: 'QLD',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: true,
      }),
    ).toBe(false)
    expect(
      isNswT3ListingFields({
        state: 'NSW',
        propertyType: 'private_room_landlord_off_site',
        isRegisteredRoomingHouse: false,
      }),
    ).toBe(false)
  })

  it('requires head-lessor consent only for head_tenant', () => {
    const ownerOk = baseRow()
    expect(isCompleteNswT3ComplianceAttestation(ownerOk, 'owner')).toBe(true)
    expect(isCompleteNswT3ComplianceAttestation(ownerOk, 'head_tenant')).toBe(false)

    const headOk = { ...baseRow(), head_lessor_consent_declared: true }
    expect(isCompleteNswT3ComplianceAttestation(headOk, 'head_tenant')).toBe(true)
  })

  it('rejects superseded or incomplete rows', () => {
    expect(
      isCompleteNswT3ComplianceAttestation({ ...baseRow(), superseded_at: '2026-08-19T01:00:00.000Z' }, 'owner'),
    ).toBe(false)
    expect(
      isCompleteNswT3ComplianceAttestation({ ...baseRow(), da_lawful_use_declared: false }, 'owner'),
    ).toBe(false)
    expect(
      isCompleteNswT3ComplianceAttestation({ ...baseRow(), warranty_version: 'old' }, 'owner'),
    ).toBe(false)
  })

  it('validates form state', () => {
    const empty = emptyNswT3ComplianceFormState()
    expect(nswT3ComplianceFormErrors(empty, 'owner')).toMatch(/registration number/i)
    expect(
      nswT3ComplianceFormErrors(
        {
          ...empty,
          registrationNumber: 'BH-1',
          daDeclared: true,
          afssDeclared: true,
          warrantyAgreed: true,
        },
        'owner',
      ),
    ).toBeNull()
    expect(
      nswT3ComplianceFormErrors(
        {
          ...empty,
          registrationNumber: 'BH-1',
          daDeclared: true,
          afssDeclared: true,
          warrantyAgreed: true,
        },
        'head_tenant',
      ),
    ).toMatch(/head-lessor/i)
  })

  it('hydrates form from a stored row', () => {
    const form = formStateFromNswT3Attestation(
      { ...baseRow(), head_lessor_consent_declared: true },
      'head_tenant',
    )
    expect(form.registrationNumber).toBe('BH-123')
    expect(form.daDeclared).toBe(true)
    expect(form.headLessorConsentDeclared).toBe(true)
    expect(form.warrantyAgreed).toBe(true)
  })
})
