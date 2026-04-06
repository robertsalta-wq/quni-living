import { Capacitor } from '@capacitor/core'
import { SITE_URL } from './site'

/**
 * Use for client `fetch` to Vercel `/api/*` routes.
 * On the normal website, same-origin `/api/...` is correct. In Capacitor the bundled origin has no
 * serverless routes, so requests must target the deployed web origin (`VITE_SITE_URL`).
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return p
  if (Capacitor.isNativePlatform()) {
    return `${SITE_URL}${p}`
  }
  return p
}
