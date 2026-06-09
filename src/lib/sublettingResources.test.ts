import { describe, expect, it } from 'vitest'
import {
  canHeadTenantAttestAuthorityToLet,
  headTenantLandlordConsentFromAttestation,
  headTenantLandlordConsentLocked,
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

  it('locks consent only after attestation with consent confirmed', () => {
    expect(
      headTenantLandlordConsentLocked({
        consent: null,
        authorityToLetAttestedAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toBe(false)
    expect(
      headTenantLandlordConsentLocked({
        consent: false,
        authorityToLetAttestedAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toBe(false)
    expect(
      headTenantLandlordConsentLocked({
        consent: true,
        authorityToLetAttestedAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toBe(true)
  })
})
