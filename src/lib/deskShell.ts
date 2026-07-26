/**
 * Desk-shell marketing experiment (`/home-v2`, `/home-v3`, flag-scoped `/pricing`).
 *
 * Flag name: desk_shell_enabled
 * Defaults: ON in Vercel Preview, OFF in Production.
 * Override: VITE_DESK_SHELL_ENABLED=true|false
 */

export const DESK_SHELL_EXPERIMENT_ROUTES = ['/home-v2', '/home-v3', '/pricing'] as const

export type DeskShellExperimentRoute = (typeof DESK_SHELL_EXPERIMENT_ROUTES)[number]

export function isDeskShellExperimentPath(pathname: string): boolean {
  const path = pathname.split('?')[0] ?? pathname
  return (DESK_SHELL_EXPERIMENT_ROUTES as readonly string[]).includes(path)
}

/**
 * Whether the menu-less desk shell chrome is active.
 * Does not gate `/home-v2` existence — that route always renders (noindex).
 * Gates header/footer removal on experiment routes (currently `/pricing`).
 */
export function isDeskShellEnabled(): boolean {
  const override = String(import.meta.env.VITE_DESK_SHELL_ENABLED ?? '')
    .trim()
    .toLowerCase()
  if (override === 'true' || override === '1') return true
  if (override === 'false' || override === '0') return false

  const vercelEnv = String(import.meta.env.VITE_VERCEL_ENV ?? '')
    .trim()
    .toLowerCase()
  if (vercelEnv === 'production') return false
  if (vercelEnv === 'preview') return true

  // Local Vite / unknown: enable so the prototype is workable in `npm run dev`.
  return Boolean(import.meta.env.DEV)
}
