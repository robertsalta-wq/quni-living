/**
 * Mirrors trg_properties_require_authority_to_let.
 * Keep the messages and branches aligned with
 * supabase/migrations/20261021020257_properties_head_tenant_consent_guard.sql.
 */

export const AUTHORITY_TO_LET_GO_LIVE_MESSAGE =
  'Confirm authority to let before this listing can go live.'

export const AUTHORITY_TO_LET_CLEAR_MESSAGE =
  'Authority to let cannot be cleared while this listing is live.'

export const HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE =
  'Confirm written landlord consent before this listing can go live.'

export const HEAD_TENANT_CONSENT_CLEAR_MESSAGE =
  'Head-tenant landlord consent cannot be cleared while this listing is live.'

export type AuthorityGuardRow = {
  status: string | null
  lister_role: string | null
  authority_to_let_attested_at: string | null
  head_tenant_landlord_consent_at: string | null
}

export function applyAuthorityToLetGuard(
  operation: 'insert' | 'update',
  prev: AuthorityGuardRow | null,
  next: AuthorityGuardRow,
): { row: AuthorityGuardRow; error: string | null } {
  const row: AuthorityGuardRow = { ...next }
  if (row.lister_role !== 'head_tenant') {
    row.head_tenant_landlord_consent_at = null
  }

  const active = row.status === 'active'
  const wasActive = prev?.status === 'active'
  const head = row.lister_role === 'head_tenant'

  if (operation === 'insert') {
    if (active && !row.authority_to_let_attested_at) {
      return { row, error: AUTHORITY_TO_LET_GO_LIVE_MESSAGE }
    }
    if (active && head && !row.head_tenant_landlord_consent_at) {
      return { row, error: HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE }
    }
    return { row, error: null }
  }

  if (active && !wasActive && !row.authority_to_let_attested_at) {
    return { row, error: AUTHORITY_TO_LET_GO_LIVE_MESSAGE }
  }
  if (active && prev?.authority_to_let_attested_at && !row.authority_to_let_attested_at) {
    return { row, error: AUTHORITY_TO_LET_CLEAR_MESSAGE }
  }
  if (active && head && prev?.head_tenant_landlord_consent_at && !row.head_tenant_landlord_consent_at) {
    return { row, error: HEAD_TENANT_CONSENT_CLEAR_MESSAGE }
  }
  const becameActive = active && !wasActive
  const switchedToHead = active && prev?.lister_role !== 'head_tenant' && head
  if ((becameActive || switchedToHead) && head && !row.head_tenant_landlord_consent_at) {
    return { row, error: HEAD_TENANT_CONSENT_GO_LIVE_MESSAGE }
  }
  return { row, error: null }
}
