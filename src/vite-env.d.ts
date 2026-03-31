/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site URL (https, no trailing slash) — used for SEO meta, JSON-LD, and Open Graph. */
  readonly VITE_SITE_URL?: string
  /** Optional absolute URL to default Open Graph image (e.g. 1200×630 JPG on your domain). */
  readonly VITE_OG_IMAGE_URL?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** EmailJS — property enquiry (optional until you configure templates) */
  readonly VITE_EMAILJS_SERVICE_ID?: string
  readonly VITE_EMAILJS_PUBLIC_KEY?: string
  readonly VITE_EMAILJS_ENQUIRY_CONFIRMATION_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_ENQUIRY_NOTIFY_TEMPLATE_ID?: string
  /** EmailJS — contact form (public site) */
  readonly VITE_EMAILJS_CONTACT_TEMPLATE_ID?: string
  /** EmailJS — landlord partnerships lead form → hello@quni.com.au */
  readonly VITE_EMAILJS_LANDLORD_LEAD_TEMPLATE_ID?: string
  /** Cloudflare Turnstile site key (public) */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Optional: full URL to verify endpoint when using `vite` without `/api` (e.g. https://app.vercel.app/api/verify-turnstile) */
  readonly VITE_TURNSTILE_VERIFY_URL?: string
  /** Stripe.js / Payment Element — publishable key only (pk_test_… / pk_live_…) */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Sentry browser SDK DSN (optional in dev) */
  readonly VITE_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
