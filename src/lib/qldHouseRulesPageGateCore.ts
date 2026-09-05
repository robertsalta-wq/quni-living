/**
 * Edge-safe gate for `/qld-house-rules` public generator.
 * Preview ON / Production ON. Override `QLD_HOUSE_RULES_PAGE_ENABLED=false` 302s (never 301).
 */

export const QLD_HOUSE_RULES_PAGE_PATH = '/qld-house-rules' as const

export function isQldHouseRulesPageGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return path === QLD_HOUSE_RULES_PAGE_PATH
}

export function resolveQldHouseRulesPageEnabled(opts: {
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
  if (vercelEnv === 'production') return true
  if (vercelEnv === 'preview') return true

  return Boolean(opts.treatUnknownAsEnabled)
}
