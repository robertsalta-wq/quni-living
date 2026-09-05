/**
 * `/qld-house-rules` Preview gate - browser bundle.
 * Defaults: ON in Vercel Preview (+ local `npm run dev`), OFF in Production.
 * Override: `VITE_QLD_HOUSE_RULES_PAGE_ENABLED=true|false`
 */

export {
  QLD_HOUSE_RULES_PAGE_PATH,
  isQldHouseRulesPageGatedPath,
  resolveQldHouseRulesPageEnabled,
} from './qldHouseRulesPageGateCore'

import { resolveQldHouseRulesPageEnabled } from './qldHouseRulesPageGateCore'

export function isQldHouseRulesPageEnabled(): boolean {
  return resolveQldHouseRulesPageEnabled({
    override: import.meta.env.VITE_QLD_HOUSE_RULES_PAGE_ENABLED,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV,
    treatUnknownAsEnabled: Boolean(import.meta.env.DEV),
  })
}
