import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDeskShellGatedPath, resolveDeskShellEnabled } from './deskShellCore'

describe('deskShell', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults OFF in production when override unset', () => {
    expect(
      resolveDeskShellEnabled({
        vercelEnv: 'production',
        override: '',
        treatUnknownAsEnabled: true,
      }),
    ).toBe(false)
  })

  it('defaults ON in preview when override unset', () => {
    expect(
      resolveDeskShellEnabled({
        vercelEnv: 'preview',
        override: '',
        treatUnknownAsEnabled: false,
      }),
    ).toBe(true)
  })

  it('honours explicit false override even in preview', () => {
    expect(
      resolveDeskShellEnabled({
        vercelEnv: 'preview',
        override: 'false',
        treatUnknownAsEnabled: true,
      }),
    ).toBe(false)
  })

  it('honours explicit true override even in production', () => {
    expect(
      resolveDeskShellEnabled({
        vercelEnv: 'production',
        override: 'true',
        treatUnknownAsEnabled: false,
      }),
    ).toBe(true)
  })

  it('recognises gated paths', () => {
    expect(isDeskShellGatedPath('/for-landlords')).toBe(true)
    expect(isDeskShellGatedPath('/for-landlords/')).toBe(true)
    expect(isDeskShellGatedPath('/services/landlord-partnerships')).toBe(false)
  })

  it('isDeskShellEnabled follows VITE_VERCEL_ENV', async () => {
    vi.stubEnv('VITE_VERCEL_ENV', 'production')
    vi.stubEnv('VITE_DESK_SHELL_ENABLED', '')
    const { isDeskShellEnabled } = await import('./deskShell')
    expect(isDeskShellEnabled()).toBe(false)
  })
})
