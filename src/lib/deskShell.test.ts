import { afterEach, describe, expect, it, vi } from 'vitest'

describe('deskShell', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults OFF in production when override unset', async () => {
    vi.stubEnv('VITE_VERCEL_ENV', 'production')
    vi.stubEnv('VITE_DESK_SHELL_ENABLED', '')
    const { isDeskShellEnabled } = await import('./deskShell')
    expect(isDeskShellEnabled()).toBe(false)
  })

  it('defaults ON in preview when override unset', async () => {
    vi.stubEnv('VITE_VERCEL_ENV', 'preview')
    vi.stubEnv('VITE_DESK_SHELL_ENABLED', '')
    const { isDeskShellEnabled } = await import('./deskShell')
    expect(isDeskShellEnabled()).toBe(true)
  })

  it('honours explicit false override even in preview', async () => {
    vi.stubEnv('VITE_VERCEL_ENV', 'preview')
    vi.stubEnv('VITE_DESK_SHELL_ENABLED', 'false')
    const { isDeskShellEnabled } = await import('./deskShell')
    expect(isDeskShellEnabled()).toBe(false)
  })

  it('recognises experiment paths', async () => {
    const { isDeskShellExperimentPath } = await import('./deskShell')
    expect(isDeskShellExperimentPath('/home-v2')).toBe(true)
    expect(isDeskShellExperimentPath('/pricing')).toBe(true)
    expect(isDeskShellExperimentPath('/listings')).toBe(false)
  })
})
