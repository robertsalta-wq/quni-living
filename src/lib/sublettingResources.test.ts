import { describe, expect, it } from 'vitest'
import {
  canHeadTenantAttestAuthorityToLet,
  HEAD_TENANT_LANDLORD_CONSENT_BLOCKED_MESSAGE,
  headTenantAuthorityConsentBlock,
  headTenantLandlordConsentFromAttestation,
} from './sublettingResources'

describe('head tenant landlord consent', () => {
  it('requires explicit yes before authority attestation', () => {
    expect(canHeadTenantAttestAuthorityToLet(null)).toBe(false)
    expect(canHeadTenantAttestAuthorityToLet(false)).toBe(false)
    expect(canHeadTenantAttestAuthorityToLet(true)).toBe(true)
  })

  it('infers consent from a prior attestation timestamp', () => {
    expect(headTenantLandlordConsentFromAttestation(null)).toBe(null)
    expect(headTenantLandlordConsentFromAttestation('2026-06-07T00:00:00.000Z')).toBe(true)
  })

  it('blocks publish attestation until a head tenant answers yes', () => {
    expect(headTenantAuthorityConsentBlock('owner', null)).toBeNull()
    expect(headTenantAuthorityConsentBlock('head_tenant', null)).toMatch(/written consent/i)
    expect(headTenantAuthorityConsentBlock('head_tenant', false)).toBe(
      HEAD_TENANT_LANDLORD_CONSENT_BLOCKED_MESSAGE,
    )
    expect(headTenantAuthorityConsentBlock('head_tenant', true)).toBeNull()
  })
})
