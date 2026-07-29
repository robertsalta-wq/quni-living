/**
 * `/list-your-room-b` Preview gate — browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_LIST_YOUR_ROOM_B_ENABLED=true|false`
 */

export {
  LIST_YOUR_ROOM_B_PATH,
  isListYourRoomBGatedPath,
  resolveListYourRoomBEnabled,
} from './listYourRoomBGateCore'

import { resolveListYourRoomBEnabled } from './listYourRoomBGateCore'

export function isListYourRoomBEnabled(): boolean {
  return resolveListYourRoomBEnabled({
    override: import.meta.env.VITE_LIST_YOUR_ROOM_B_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
