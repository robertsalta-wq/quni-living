/**
 * Edge-safe gate for `/list-your-room-c` landlord invite visual variant.
 * Preview ON / Production OFF. Override: LIST_YOUR_ROOM_C_ENABLED.
 */

export const LIST_YOUR_ROOM_C_PATH = '/list-your-room-c' as const

export function isListYourRoomCGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return path === LIST_YOUR_ROOM_C_PATH
}

/** Shared resolver - browser env bag or Edge `process.env`. */
export function resolveListYourRoomCEnabled(opts: {
  override?: string | null
  vercelEnv?: string | null
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
