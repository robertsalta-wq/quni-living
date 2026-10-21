import { describe, expect, it } from 'vitest'
import {
  canHeadTenantAttestAuthorityToLet,
  HEAD_TENANT_LANDLORD_CONSENT_BLOCKED_MESSAGE,
  headTenantAuthorityConsentBlock,
  headTenantLandlordConsentFromColumn,
  headTenantLandlordConsentPatch,
  activeHeadTenantConsentSaveBlock,
} from './sublettingResources'

describe('head tenant landlord consent', () => {
  it('requires explicit yes before authority attestation', () => {
    expect(canHeadTenantAttestAuthorityToLet(null)).toBe(false)
    expect(canHeadTenantAttestAuthorityToLet(false)).toBe(false)
    expect(canHeadTenantAttestAuthorityToLet(true)).toBe(true)
  })

  it('reads consent only from the consent timestamp', () => {
    expect(headTenantLandlordConsentFromColumn(null)).toBe(null)
    expect(headTenantLandlordConsentFromColumn('2026-06-07T00:00:00.000Z')).toBe(true)
  })

  it('writes the consent timestamp only for a head tenant who answers yes', () => {
    const written = headTenantLandlordConsentPatch({
      listerRole: 'head_tenant',
      consent: true,
      existingConsentAt: null,
    })
    expect(written).toEqual(
      expect.objectContaining({ head_tenant_landlord_consent_at: expect.any(String) }),
    )

    expect(
      headTenantLandlordConsentPatch({
        listerRole: 'head_tenant',
        consent: true,
        existingConsentAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toEqual({})

    expect(
      headTenantLandlordConsentPatch({
        listerRole: 'owner',
        consent: true,
        existingConsentAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toEqual({ head_tenant_landlord_consent_at: null })

    expect(
      headTenantLandlordConsentPatch({
        listerRole: 'head_tenant',
        consent: false,
        existingConsentAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toEqual({ head_tenant_landlord_consent_at: null })

    expect(
      headTenantLandlordConsentPatch({
        listerRole: 'head_tenant',
        consent: null,
        existingConsentAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toEqual({})

    expect(
      headTenantLandlordConsentPatch({
        listerRole: 'head_tenant',
        consent: true,
        existingConsentAt: '2026-06-07T00:00:00.000Z',
        clearBecauseAuthorityCleared: true,
      }),
    ).toEqual({ head_tenant_landlord_consent_at: null })
  })

  it('blocks an already-live head tenant until they answer yes', () => {
    expect(activeHeadTenantConsentSaveBlock('active', 'head_tenant', null)).toMatch(/written consent/i)
    expect(activeHeadTenantConsentSaveBlock('active', 'head_tenant', true)).toBeNull()
    expect(activeHeadTenantConsentSaveBlock('draft', 'head_tenant', null)).toBeNull()
    expect(activeHeadTenantConsentSaveBlock('inactive', 'head_tenant', false)).toBeNull()
    expect(activeHeadTenantConsentSaveBlock('active', 'owner', null)).toBeNull()
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
