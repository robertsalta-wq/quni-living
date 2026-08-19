import { describe, expect, it, vi } from 'vitest'
import {
  NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  emptyNswT3ComplianceFormState,
} from './nswT3ComplianceAttestation'
import { recordNswT3ComplianceAttestation } from './nswT3ComplianceAttestationPersist'

describe('recordNswT3ComplianceAttestation', () => {
  it('calls record_property_t3_attestation RPC without client timestamps or attested_by', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'attestation-id', error: null })
    const client = { rpc } as never

    const form = {
      ...emptyNswT3ComplianceFormState('BH-99'),
      daDeclared: true,
      afssDeclared: true,
      afssStatementDate: '2026-01-15',
      afssExpiryDate: '2027-01-15',
      headLessorConsentDeclared: true,
      warrantyAgreed: true,
    }

    const result = await recordNswT3ComplianceAttestation({
      client,
      propertyId: 'prop-1',
      attestedByUserId: 'user-should-not-be-sent',
      listerRole: 'head_tenant',
      form,
    })

    expect(result).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('record_property_t3_attestation', {
      p_property_id: 'prop-1',
      p_registration_number: 'BH-99',
      p_da_lawful_use_declared: true,
      p_afss_current_declared: true,
      p_afss_statement_date: '2026-01-15',
      p_afss_expiry_date: '2027-01-15',
      p_head_lessor_consent_declared: true,
      p_warranty_version: NSW_T3_COMPLIANCE_WARRANTY_VERSION,
    })

    const payload = rpc.mock.calls[0][1] as Record<string, unknown>
    expect(payload).not.toHaveProperty('attested_at')
    expect(payload).not.toHaveProperty('superseded_at')
    expect(payload).not.toHaveProperty('attested_by')
    expect(payload).not.toHaveProperty('p_attested_at')
    expect(payload).not.toHaveProperty('p_superseded_at')
    expect(payload).not.toHaveProperty('p_attested_by')
  })

  it('sends null head-lessor consent for owner listings', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'attestation-id', error: null })
    const client = { rpc } as never

    const form = {
      ...emptyNswT3ComplianceFormState('BH-1'),
      daDeclared: true,
      afssDeclared: true,
      warrantyAgreed: true,
      headLessorConsentDeclared: true,
    }

    await recordNswT3ComplianceAttestation({
      client,
      propertyId: 'prop-2',
      attestedByUserId: 'u1',
      listerRole: 'owner',
      form,
    })

    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_head_lessor_consent_declared: null,
      p_warranty_version: NSW_T3_COMPLIANCE_WARRANTY_VERSION,
    })
  })

  it('returns the RPC error message on failure', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'warranty_version must be nsw-t3-compliance-warranty-v1' },
    })
    const client = { rpc } as never

    const result = await recordNswT3ComplianceAttestation({
      client,
      propertyId: 'prop-3',
      attestedByUserId: 'u1',
      listerRole: 'owner',
      form: {
        ...emptyNswT3ComplianceFormState('BH-1'),
        daDeclared: true,
        afssDeclared: true,
        warrantyAgreed: true,
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'warranty_version must be nsw-t3-compliance-warranty-v1',
    })
  })
})
