/** Canonical production origin (no trailing slash). Used for meta URLs and JSON-LD. */
function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = 'https://quni-living.vercel.app'
  const t = raw?.trim()
  if (!t || !/^https?:\/\//i.test(t)) return fallback
  return t.replace(/\/+$/, '')
}

export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)

export const SITE_NAME = 'Quni Living'

/**
 * Tailwind classes for main content width (matches `theme.extend.maxWidth.site` in `tailwind.config.js` = 1200px).
 * Use for property detail hero, thumbnails, and any block that must align with the header — do not use raw `w-full`
 * for the gallery without this wrapper, or the hero will span the full viewport.
 */
export const SITE_CONTENT_MAX_CLASS = 'max-w-site mx-auto w-full min-w-0 px-3 sm:px-6'

/** Default share / meta description (homepage, fallbacks). */
export const DEFAULT_DESCRIPTION =
  'Browse verified rooms near Australian universities. Free for students. ID-verified landlords, RTA-compliant agreements, direct payouts.'

/** Default document title and Open Graph / Twitter title when not route-specific. */
export const DEFAULT_OG_TITLE = 'Quni Living — verified rooms near Australian universities'

/** Canonical marketing origin for static HTML OG tags (production domain). */
export const DEFAULT_OG_URL = 'https://quni.com.au'

const ogFromEnv = (import.meta.env.VITE_OG_IMAGE_URL as string | undefined)?.trim()
/** 1200×630 branded share image (`public/og-default.png`). Pre-launch: Vercel origin until DNS cutover. */
// TODO: switch back to https://quni.com.au/og-default.png after DNS cutover
export const DEFAULT_OG_IMAGE =
  ogFromEnv || 'https://quni-living.vercel.app/og-default.png'

export const DEFAULT_OG_IMAGE_ALT = 'Quni — verified rooms near Australian universities'

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
  '/onboarding',
  '/verify-email',
  '/auth/callback',
] as const

/** App areas that should not be indexed (dashboards, checkout, onboarding). */
export function isSeoPrivatePath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return PRIVATE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

export function absoluteUrl(path: string): string {
  const q = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${q}`
}
