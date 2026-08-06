/**
 * Edge-safe gate for `/list-your-room-b` landlord invite A/B landing.
 * Preview ON / Production OFF (compare without touching live `/list-your-room`).
 * Override: LIST_YOUR_ROOM_B_ENABLED.
 */

export const LIST_YOUR_ROOM_B_PATH = '/list-your-room-b' as const

export function isListYourRoomBGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return path === LIST_YOUR_ROOM_B_PATH
}

/** Shared resolver - browser env bag or Edge `process.env`. */
export function resolveListYourRoomBEnabled(opts: {
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
  if (vercelEnv === 'production') return false
  if (vercelEnv === 'preview') return true

  return Boolean(opts.treatUnknownAsEnabled)
}
