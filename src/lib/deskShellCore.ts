/**
 * Edge-safe desk-shell flag helpers (no `import.meta`).
 * Browser wrapper: `deskShell.ts`. Middleware imports this module.
 */

export const DESK_SHELL_GATED_ROUTES = ['/for-landlords'] as const

export type DeskShellGatedRoute = (typeof DESK_SHELL_GATED_ROUTES)[number]

export function isDeskShellGatedPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '') || '/'
  return (DESK_SHELL_GATED_ROUTES as readonly string[]).includes(path)
}

/** Shared resolver - browser env bag or Edge `process.env`. */
export function resolveDeskShellEnabled(opts: {
  override?: string | null
  vercelEnv?: string | null
  /** Local Vite / unknown non-production. */
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
