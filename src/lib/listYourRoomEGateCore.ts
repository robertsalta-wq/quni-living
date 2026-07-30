/**
 * Edge-safe gate for `/list-your-room-e` landlord invite desk variant.
 * Preview ON / Production OFF. Override: LIST_YOUR_ROOM_E_ENABLED.
 */

export const LIST_YOUR_ROOM_E_PATH = '/list-your-room-e' as const

export function isListYourRoomEGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return path === LIST_YOUR_ROOM_E_PATH
}

/** Shared resolver — browser env bag or Edge `process.env`. */
export function resolveListYourRoomEEnabled(opts: {
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
