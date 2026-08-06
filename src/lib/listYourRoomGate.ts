/**
 * `/list-your-room` Preview gate - browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_LIST_YOUR_ROOM_ENABLED=true|false`
 */

export {
  LIST_YOUR_ROOM_PATH,
  isListYourRoomGatedPath,
  resolveListYourRoomEnabled,
} from './listYourRoomGateCore'

import { resolveListYourRoomEnabled } from './listYourRoomGateCore'

export function isListYourRoomEnabled(): boolean {
  return resolveListYourRoomEnabled({
    override: import.meta.env.VITE_LIST_YOUR_ROOM_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
