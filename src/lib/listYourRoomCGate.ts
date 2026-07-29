/**
 * `/list-your-room-c` Preview gate — browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_LIST_YOUR_ROOM_C_ENABLED=true|false`
 */

export {
  LIST_YOUR_ROOM_C_PATH,
  isListYourRoomCGatedPath,
  resolveListYourRoomCEnabled,
} from './listYourRoomCGateCore'

import { resolveListYourRoomCEnabled } from './listYourRoomCGateCore'

export function isListYourRoomCEnabled(): boolean {
  return resolveListYourRoomCEnabled({
    override: import.meta.env.VITE_LIST_YOUR_ROOM_C_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
