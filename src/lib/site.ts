/** Canonical production origin (no trailing slash). Used for meta URLs and JSON-LD. */
function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = 'https://quni.com.au'
  const t = raw?.trim()
  if (!t || !/^https?:\/\//i.test(t)) return fallback
  return t.replace(/\/+$/, '')
}

export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)

export const SITE_NAME = 'Quni Living'

/**
 * Tailwind classes for main content width (matches `theme.extend.maxWidth.site` in `tailwind.config.js` = 1200px).
 * Use for property detail hero, thumbnails, and any block that must align with the header - do not use raw `w-full`
 * for the gallery without this wrapper, or the hero will span the full viewport.
 */
export const SITE_CONTENT_MAX_CLASS = 'max-w-site mx-auto w-full min-w-0 px-3 sm:px-6'

/** One-line positioning (footer, hero sublines). */
export const MARKETPLACE_TAGLINE =
  'Verified rooms near Australian universities and workplaces - for students, graduates, and professionals.'

/** Default share / meta description (homepage, fallbacks). */
export const DEFAULT_DESCRIPTION =
  'Browse verified rooms near campus and work. Free for renters. Stripe-verified hosts, RTA-compliant agreements, direct payouts.'

/** Default document title and Open Graph / Twitter title when not route-specific. */
export const DEFAULT_OG_TITLE = 'Quni Living - verified accommodation near campus & work'

/** Property/listing meta description suffix. */
export const LISTING_SEO_SUFFIX = 'Verified accommodation on Quni Living, Australia.'

/** Fallback listing page title when property title is missing. */
export const LISTING_TITLE_FALLBACK = 'Accommodation listing'

/** Browse page title segment (listings index, non–professional-renter persona). */
export const RENTERS_BROWSE_SEO_TITLE = 'Rooms & rentals near campus'

/** Canonical marketing origin for static HTML OG tags (production domain). */
export const DEFAULT_OG_URL = 'https://quni.com.au'

const ogFromEnv = (import.meta.env.VITE_OG_IMAGE_URL as string | undefined)?.trim()
/** 1200×630 branded share image (`public/og-default.png`). */
export const DEFAULT_OG_IMAGE = ogFromEnv || 'https://quni.com.au/og-default.png'

export const DEFAULT_OG_IMAGE_ALT = 'Quni - verified accommodation near campus and work'

export const ORGANIZATION_EMAIL = 'hello@quni.com.au'

const PRIVATE_PREFIXES = [
  '/admin',
  '/student-dashboard',
  '/student-profile',
  '/student/profile',
  '/landlord/dashboard',
  '/landlord-profile',
  '/landlord/property',
  '/booking/',
  '/messages',
  '/onboarding',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
] as const

/** App areas that should not be indexed (dashboards, checkout, onboarding). */
export function isSeoPrivatePath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return PRIVATE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

const FOCUS_FORM_FLOW_PREFIXES = [
  '/onboarding',
  '/booking/',
  '/signup',
  '/student-signup',
  '/landlord-signup',
  '/landlord/property/new',
  '/landlord/property/edit/',
] as const

/** Multi-step signup, onboarding, booking, and listing forms - hide marketing footer for a cleaner flow. */
export function isFocusFormFlowPath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return FOCUS_FORM_FLOW_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))
}

export function absoluteUrl(path: string): string {
  const q = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${q}`
}
