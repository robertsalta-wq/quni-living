/**
 * Absolute origin for serverless → serverless calls on Vercel.
 * Prefer the deployment host (VERCEL_URL) over a custom domain: internal routes
 * must hit the same deployment reliably; custom domains can misroute or fail TLS.
 */
export function internalApiOrigin() {
  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '')
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '')
    return `https://${host}`
  }

  const explicitOverride = (process.env.INTERNAL_API_ORIGIN || '').trim().replace(/\/$/, '')
  if (explicitOverride.startsWith('http://') || explicitOverride.startsWith('https://')) {
    return explicitOverride
  }

  const explicit = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
    return explicit
  }

  return 'https://quni-living.vercel.app'
}
