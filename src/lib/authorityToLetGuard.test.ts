import { describe, expect, it } from 'vitest'
import {
  applyAuthorityToLetGuard,
  AUTHORITY_TO_LET_CLEAR_MESSAGE,
  AUTHORITY_TO_LET_GO_LIVE_MESSAGE,
  HEAD_TENANT_CONSENT_CLEAR_MESSAGE,
  HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE,
  type AuthorityGuardRow,
} from './authorityToLetGuard'

const authority = '2026-06-19T00:00:00.000Z'
const consent = '2026-10-21T00:00:00.000Z'

function row(partial: Partial<AuthorityGuardRow> & Pick<AuthorityGuardRow, 'status'>): AuthorityGuardRow {
  return {
    status: partial.status,
    lister_role: partial.lister_role ?? 'owner',
    authority_to_let_attested_at: partial.authority_to_let_attested_at ?? null,
    head_tenant_landlord_consent_at: partial.head_tenant_landlord_consent_at ?? null,
  }
}

describe('authority to let guard transitions', () => {
  it('rejects an active head-tenant insert without consent', () => {
    const result = applyAuthorityToLetGuard(
      'insert',
      null,
      row({ status: 'active', lister_role: 'head_tenant', authority_to_let_attested_at: authority }),
    )
    expect(result.error).toBe(HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE)
  })

  it('rejects going active without consent', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({ status: 'draft', lister_role: 'head_tenant', authority_to_let_attested_at: authority }),
      row({ status: 'active', lister_role: 'head_tenant', authority_to_let_attested_at: authority }),
    )
    expect(result.error).toBe(HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE)
  })

  it('rejects switching a live owner to head tenant without consent', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({ status: 'active', lister_role: 'owner', authority_to_let_attested_at: authority }),
      row({ status: 'active', lister_role: 'head_tenant', authority_to_let_attested_at: authority }),
    )
    expect(result.error).toBe(HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE)
  })

  it('allows that switch when consent is set in the same update', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({ status: 'active', lister_role: 'owner', authority_to_let_attested_at: authority }),
      row({
        status: 'active',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
    )
    expect(result.error).toBeNull()
  })

  it('rejects clearing consent on a live head-tenant listing', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({
        status: 'active',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
      row({
        status: 'active',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: null,
      }),
    )
    expect(result.error).toBe(HEAD_TENANT_CONSENT_CLEAR_MESSAGE)
  })

  it('allows other updates of a live head tenant who has not confirmed yet', () => {
    const grandfather = row({
      status: 'active',
      lister_role: 'head_tenant',
      authority_to_let_attested_at: authority,
    })
    const result = applyAuthorityToLetGuard('update', grandfather, { ...grandfather })
    expect(result.error).toBeNull()
  })

  it('allows going live when both stamps are set', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({ status: 'draft', lister_role: 'head_tenant' }),
      row({
        status: 'active',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
    )
    expect(result.error).toBeNull()
  })

  it('still rejects going live without authority, before the consent check', () => {
    const result = applyAuthorityToLetGuard(
      'insert',
      null,
      row({ status: 'active', lister_role: 'head_tenant', head_tenant_landlord_consent_at: consent }),
    )
    expect(result.error).toBe(AUTHORITY_TO_LET_GO_LIVE_MESSAGE)
  })

  it('still rejects clearing authority on a live listing', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({ status: 'active', authority_to_let_attested_at: authority }),
      row({ status: 'active', authority_to_let_attested_at: null }),
    )
    expect(result.error).toBe(AUTHORITY_TO_LET_CLEAR_MESSAGE)
  })

  it('clears consent when the role is no longer head tenant, including on a live row', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({
        status: 'active',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
      row({
        status: 'active',
        lister_role: 'owner',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
    )
    expect(result.error).toBeNull()
    expect(result.row.head_tenant_landlord_consent_at).toBeNull()
  })

  it('allows a paused head tenant to drop both stamps', () => {
    const result = applyAuthorityToLetGuard(
      'update',
      row({
        status: 'inactive',
        lister_role: 'head_tenant',
        authority_to_let_attested_at: authority,
        head_tenant_landlord_consent_at: consent,
      }),
      row({ status: 'inactive', lister_role: 'head_tenant' }),
    )
    expect(result.error).toBeNull()
  })
})
