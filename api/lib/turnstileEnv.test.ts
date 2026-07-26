import { afterEach, describe, expect, it, vi } from 'vitest'

describe('turnstileEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses Cloudflare test secret on Vercel preview', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'real-secret-should-not-be-used')
    const { getTurnstileSecretKey, TURNSTILE_TEST_SECRET_KEY, useTurnstileTestKeys } = await import(
      './turnstileEnv'
    )
    expect(useTurnstileTestKeys()).toBe(true)
    expect(getTurnstileSecretKey()).toBe(TURNSTILE_TEST_SECRET_KEY)
  })

  it('uses real secret on Vercel production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'prod-secret')
    const { getTurnstileSecretKey, useTurnstileTestKeys } = await import('./turnstileEnv')
    expect(useTurnstileTestKeys()).toBe(false)
    expect(getTurnstileSecretKey()).toBe('prod-secret')
  })
})
