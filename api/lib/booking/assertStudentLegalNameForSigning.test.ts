import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../platformConfig.js', () => ({
  fetchLegalNameSigningGateEnabled: vi.fn(),
}))

import { fetchLegalNameSigningGateEnabled } from '../platformConfig.js'
import {
  assertStudentLegalNameForSigning,
  TENANT_LEGAL_NAME_NOT_READY_CODE,
  TenantLegalNameNotReadyError,
} from './assertStudentLegalNameForSigning.js'

const admin = {} as never

const lockedProfile = {
  first_name: 'Han',
  last_name: 'Nguyen',
  verification_type: 'identity',
  legal_name_locked_at: '2026-07-01T00:00:00Z',
}

const unlockedProfile = {
  first_name: 'Han',
  last_name: 'Nguyen',
  full_name: 'Han N',
  verification_type: 'identity',
  legal_name_locked_at: null,
}

describe('assertStudentLegalNameForSigning', () => {
  beforeEach(() => {
    vi.mocked(fetchLegalNameSigningGateEnabled).mockReset()
  })

  it('no-ops when flag is false regardless of lock state', async () => {
    vi.mocked(fetchLegalNameSigningGateEnabled).mockResolvedValue(false)
    await expect(assertStudentLegalNameForSigning(admin, null)).resolves.toBeUndefined()
    await expect(assertStudentLegalNameForSigning(admin, unlockedProfile)).resolves.toBeUndefined()
  })

  it('throws structured 409 when flag on and tenant not locked', async () => {
    vi.mocked(fetchLegalNameSigningGateEnabled).mockResolvedValue(true)
    await expect(assertStudentLegalNameForSigning(admin, unlockedProfile)).rejects.toMatchObject({
      code: TENANT_LEGAL_NAME_NOT_READY_CODE,
      status: 409,
    })
    await expect(assertStudentLegalNameForSigning(admin, unlockedProfile)).rejects.toBeInstanceOf(
      TenantLegalNameNotReadyError,
    )
  })

  it('proceeds when flag on and tenant locked with identity verification', async () => {
    vi.mocked(fetchLegalNameSigningGateEnabled).mockResolvedValue(true)
    await expect(assertStudentLegalNameForSigning(admin, lockedProfile)).resolves.toBeUndefined()
  })

  it('does not treat full_name as ready when first/last are missing', async () => {
    vi.mocked(fetchLegalNameSigningGateEnabled).mockResolvedValue(true)
    await expect(
      assertStudentLegalNameForSigning(admin, {
        first_name: null,
        last_name: null,
        full_name: 'Legacy Name',
        verification_type: 'identity',
        legal_name_locked_at: '2026-07-01T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(TenantLegalNameNotReadyError)
  })
})
