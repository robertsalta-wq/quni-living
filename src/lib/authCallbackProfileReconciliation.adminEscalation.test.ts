import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { clearProfileHydrateInflight } from './authProfile'
import { reconcileAuthCallbackProfile } from './authCallbackProfileReconciliation'
import { fetchIsPlatformAdmin, linkPlatformStaffUserIfNeeded } from './platformStaff'

vi.mock('./platformStaff', () => ({
  fetchIsPlatformAdmin: vi.fn(),
  linkPlatformStaffUserIfNeeded: vi.fn(),
}))

vi.mock('./supabase', () => {
  const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return {
    supabase: { from },
    isSupabaseConfigured: true,
  }
})

function spoofAdminUser(overrides: Partial<User> = {}): User {
  return {
    id: 'spoof-callback-user-1',
    email: 'spoof@example.com',
    created_at: '2026-07-01T00:00:00Z',
    user_metadata: { role: 'admin' },
    app_metadata: {},
    aud: 'authenticated',
    ...overrides,
  } as User
}

describe('auth callback admin privilege escalation via user_metadata', () => {
  beforeEach(() => {
    clearProfileHydrateInflight()
    vi.mocked(fetchIsPlatformAdmin).mockReset()
    vi.mocked(linkPlatformStaffUserIfNeeded).mockReset()
    vi.mocked(fetchIsPlatformAdmin).mockResolvedValue(false)
    vi.mocked(linkPlatformStaffUserIfNeeded).mockResolvedValue(undefined)
  })

  it('does not resolve role=admin from spoofed user_metadata.role when RPC denies', async () => {
    const result = await reconcileAuthCallbackProfile(spoofAdminUser(), {
      afterSignupEmailConfirm: false,
      urlRoute: null,
      urlRole: null,
    })

    expect(fetchIsPlatformAdmin).toHaveBeenCalledTimes(1)
    expect(linkPlatformStaffUserIfNeeded).not.toHaveBeenCalled()
    expect(result.role).not.toBe('admin')
    expect(result).toEqual({ role: null, profile: null })
  })

  it('resolves role=admin for platform_staff even with landlord marketplace metadata', async () => {
    vi.mocked(fetchIsPlatformAdmin).mockResolvedValue(true)

    const result = await reconcileAuthCallbackProfile(
      spoofAdminUser({ user_metadata: { role: 'landlord' } }),
      {
        afterSignupEmailConfirm: false,
        urlRoute: null,
        urlRole: null,
      },
    )

    expect(fetchIsPlatformAdmin).toHaveBeenCalledTimes(1)
    expect(linkPlatformStaffUserIfNeeded).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ role: 'admin', profile: null })
  })
})
