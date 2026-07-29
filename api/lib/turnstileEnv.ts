/**
 * Cloudflare Turnstile env resolution.
 * Preview / local: official always-pass test pair (no hostname allowlist).
 * Production: real TURNSTILE_SECRET_KEY from Vercel.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */

/** Always-pass visible widget — pair with TURNSTILE_TEST_SECRET_KEY only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
/** Always accepts the dummy token from TURNSTILE_TEST_SITE_KEY. */
export const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'

/**
 * Use Cloudflare dummy keys outside Production so Preview hostnames never need allowlisting.
 */
export function useTurnstileTestKeys(): boolean {
  const vercelEnv = (process.env.VERCEL_ENV || '').trim()
  if (vercelEnv === 'production') return false
  if (vercelEnv === 'preview' || vercelEnv === 'development') return true
  // Local / non-Vercel (e.g. unit tests, `vite` + `vercel dev` without VERCEL_ENV)
  return process.env.NODE_ENV !== 'production'
}

export function getTurnstileSecretKey(): string {
  if (useTurnstileTestKeys()) return TURNSTILE_TEST_SECRET_KEY
  return (process.env.TURNSTILE_SECRET_KEY || '').trim()
}
