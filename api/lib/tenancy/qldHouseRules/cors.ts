const LOCAL_DEV = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

/** Reflect CORS only for our site, Vercel previews, and local dev. Not `*`. */
export function qldHouseRulesCorsAllowOrigin(origin: string): string | null {
  const o = origin.trim()
  if (!o) return null
  if (o === 'https://quni.com.au' || o === 'https://www.quni.com.au') return o
  if (LOCAL_DEV.test(o)) return o
  try {
    const host = new URL(o).hostname.toLowerCase()
    if (host === 'quni-living.vercel.app') return o
    if (host.startsWith('quni-living-') && host.endsWith('.vercel.app')) return o
  } catch {
    return null
  }
  return null
}
