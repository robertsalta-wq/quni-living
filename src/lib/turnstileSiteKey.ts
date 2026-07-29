/**
 * Client Turnstile site key.
 * Preview + local: Cloudflare always-pass test key (no hostname allowlist).
 * Production: VITE_TURNSTILE_SITE_KEY.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */

/** Always-pass visible widget — must pair with server TURNSTILE_TEST_SECRET_KEY. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'

/**
 * True on Vite DEV and Vercel Preview (via VITE_VERCEL_ENV). Never on Production builds.
 */
export function useTurnstileTestKeys(): boolean {
  if (import.meta.env.DEV) return true
  return (import.meta.env.VITE_VERCEL_ENV ?? '').trim() === 'preview'
}

export function getTurnstileSiteKey(): string {
  if (useTurnstileTestKeys()) return TURNSTILE_TEST_SITE_KEY
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
}

export function isTurnstileSiteKeyConfigured(): boolean {
  return Boolean(getTurnstileSiteKey())
}
