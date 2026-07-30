/**
 * `/list-your-room-e` Preview gate — browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
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
