/**
 * `/list-your-room-d` Preview gate — browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_LIST_YOUR_ROOM_D_ENABLED=true|false`
 */

export {
  LIST_YOUR_ROOM_D_PATH,
  isListYourRoomDGatedPath,
  resolveListYourRoomDEnabled,
} from './listYourRoomDGateCore'

import { resolveListYourRoomDEnabled } from './listYourRoomDGateCore'

export function isListYourRoomDEnabled(): boolean {
  return resolveListYourRoomDEnabled({
    override: import.meta.env.VITE_LIST_YOUR_ROOM_D_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
