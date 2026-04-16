/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site URL (https, no trailing slash) — used for SEO meta, JSON-LD, and Open Graph. */
  readonly VITE_SITE_URL?: string
  /** Optional absolute URL to default Open Graph image (e.g. 1200×630 JPG on your domain). */
  readonly VITE_OG_IMAGE_URL?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Cloudflare Turnstile site key (public) */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Optional: full URL to verify endpoint when using `vite` without `/api` (e.g. https://app.vercel.app/api/verify-turnstile) */
  readonly VITE_TURNSTILE_VERIFY_URL?: string
  /** Stripe.js / Payment Element — publishable key only (pk_test_… / pk_live_…) */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Sentry browser SDK DSN (optional in dev) */
  readonly VITE_SENTRY_DSN?: string
  /** AES key for encrypting vendor credentials in admin (Apps modal) before Supabase update */
  readonly VITE_CREDENTIALS_ENC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
