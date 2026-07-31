/**
 * `/list-your-room-e` browser gate.
 * Defaults: ON in Vercel Preview and Production (+ local `npm run dev`).
 * Override: `VITE_LIST_YOUR_ROOM_E_ENABLED=true|false`
 */

export {
  LIST_YOUR_ROOM_E_PATH,
  isListYourRoomEGatedPath,
  resolveListYourRoomEEnabled,
} from './listYourRoomEGateCore'

import { resolveListYourRoomEEnabled } from './listYourRoomEGateCore'

export function isListYourRoomEEnabled(): boolean {
  return resolveListYourRoomEEnabled({
    override: import.meta.env.VITE_LIST_YOUR_ROOM_E_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
