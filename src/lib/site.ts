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
export const SITE_CONTENT_MAX_CLASS = 'max-w-site mx-auto w-full min-w-0 px-1 sm:px-6'

export const DEFAULT_DESCRIPTION =
  "Australia's student accommodation marketplace. Browse verified listings near your university, enquire with landlords, and book online with Quni Living."

const ogFromEnv = (import.meta.env.VITE_OG_IMAGE_URL as string | undefined)?.trim()
/** Prefer a 1200×630 JPG/PNG on your domain; fallback is a stable hero-style image. */
export const DEFAULT_OG_IMAGE =
  ogFromEnv ||
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&h=630&fit=crop&q=80'

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
