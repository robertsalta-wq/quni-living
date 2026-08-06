/**
 * Edge-safe gate for `/list-your-room` landlord outreach landing.
 * Preview ON / Production ON (opened for landlord invite go-live). Override: LIST_YOUR_ROOM_ENABLED.
 */

export const LIST_YOUR_ROOM_PATH = '/list-your-room' as const

export function isListYourRoomGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return path === LIST_YOUR_ROOM_PATH
}

/** Shared resolver - browser env bag or Edge `process.env`. */
export function resolveListYourRoomEnabled(opts: {
  override?: string | null
  vercelEnv?: string | null
  /** Local Vite / unknown non-production. */
  treatUnknownAsEnabled?: boolean
}): boolean {
  const override = String(opts.override ?? '')
    .trim()
    .toLowerCase()
  if (override === 'true' || override === '1') return true
  if (override === 'false' || override === '0') return false

  const vercelEnv = String(opts.vercelEnv ?? '')
    .trim()
    .toLowerCase()
  if (vercelEnv === 'production') return true
  if (vercelEnv === 'preview') return true

  return Boolean(opts.treatUnknownAsEnabled)
}
