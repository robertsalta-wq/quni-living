/**
 * Desk-shell marketing experiment flag (`desk_shell_enabled`) — browser bundle.
 *
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_DESK_SHELL_ENABLED=true|false`
 *
 * Gates: Preview desk-system home (Reception band + Listings/Landlord), `/for-landlords`
 * desk page, Reception nav/dock. Production keeps classic coral hero and 302s `/for-landlords`.
 */

export {
  DESK_SHELL_GATED_ROUTES,
  isDeskShellGatedPath,
  resolveDeskShellEnabled,
  type DeskShellGatedRoute,
} from './deskShellCore'

import { resolveDeskShellEnabled } from './deskShellCore'

/**
 * Whether desk-shell experiment surfaces are active in the browser bundle.
 */
export function isDeskShellEnabled(): boolean {
  return resolveDeskShellEnabled({
    override: import.meta.env.VITE_DESK_SHELL_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
