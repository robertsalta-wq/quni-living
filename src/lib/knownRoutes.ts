/**
 * Route shapes that may be served as spa.html (or prerendered static HTML).
 * Used by Edge middleware to return a real HTTP 404 for unknown path shapes.
 * Keep in sync with `src/App.tsx`.
 */

const STATIC_FILE_EXT =
  /\.(?:js|css|map|json|ico|png|jpe?g|gif|webp|svg|woff2?|ttf|eot|txt|xml|webmanifest|pdf|mp4|webm|html)$/i

/** Exact pathnames (no trailing slash except `/`). */
const EXACT = new Set([
  '/',
  '/guides',
  '/for-universities',
  '/listings',
  '/properties',
  '/search',
  '/rent-near-campus',
  '/international',
  '/student-accommodation',
  '/terms',
  '/privacy',
  '/non-discrimination',
  '/landlord-service-agreement',
  '/about',
  '/how-it-works',
  '/refunds',
  '/pricing',
  '/contact',
  '/faq',
  '/verification',
  '/services',
  '/services/student-accommodation',
  '/services/property-management',
  '/services/landlord-partnerships',
  '/services/fully-furnished',
  '/for-landlords',
  '/landlords/ai',
  '/auth/callback',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/signup',
  '/student-signup',
  '/landlord-signup',
  '/onboarding',
  '/onboarding/student',
  '/onboarding/landlord',
  '/student-dashboard',
  '/student-profile',
  '/student/profile',
  '/landlord/dashboard',
  '/landlord/onboarding',
  '/landlord-dashboard',
  '/landlord-profile',
  '/landlord/profile',
  '/landlord/property/new',
  '/landlord/property/new/basic',
  '/sample-agreements',
  '/messages',
  '/admin',
  '/spa.html',
  '/404.html',
  '/index.html',
])

/**
 * Pathname patterns for dynamic / nested app routes.
 * Each regex is anchored and matches the full pathname.
 */
const PATTERNS: RegExp[] = [
  /^\/guides\/[^/]+\/?$/,
  /^\/student-accommodation\/[^/]+\/?$/,
  /^\/student-accommodation\/[^/]+\/[^/]+\/?$/,
  /^\/listings\/[^/]+\/?$/,
  /^\/properties\/[^/]+\/?$/,
  /^\/invite\/[^/]+\/?$/,
  /^\/booking\/[^/]+\/?$/,
  /^\/messages\/[^/]+\/?$/,
  /^\/landlord\/bookings\/[^/]+\/review\/?$/,
  /^\/landlord\/property\/new\/section\/[^/]+\/?$/,
  /^\/landlord\/property\/edit\/[^/]+\/?$/,
  /^\/landlord\/property\/edit\/[^/]+\/basic\/?$/,
  /^\/landlord\/property\/edit\/[^/]+\/section\/[^/]+\/?$/,
  /^\/admin(?:\/.*)?$/,
]

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  let p = pathname.split('?')[0]?.split('#')[0] ?? '/'
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

/** True when the path looks like a static asset (should not be treated as an HTML route). */
export function isStaticAssetPath(pathname: string): boolean {
  const p = normalizePathname(pathname)
  if (p.startsWith('/assets/')) return true
  if (p.startsWith('/api/')) return true
  const base = p.split('/').pop() ?? ''
  return STATIC_FILE_EXT.test(base)
}

/** True when pathname is a known app/marketing route shape (may still 200 with spa.html). */
export function isKnownAppPath(pathname: string): boolean {
  const p = normalizePathname(pathname)
  if (isStaticAssetPath(p)) return true
  if (EXACT.has(p)) return true
  return PATTERNS.some((re) => re.test(p))
}
