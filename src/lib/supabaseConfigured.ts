/**
 * Env-only Supabase readiness check — no `@supabase/supabase-js` import.
 * Use this on marketing critical paths so the client chunk can stay deferred.
 */

const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env
const nodeEnv =
  typeof globalThis !== 'undefined' && 'process' in globalThis
    ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    : undefined

const envUrl = (viteEnv?.VITE_SUPABASE_URL ?? nodeEnv?.VITE_SUPABASE_URL ?? nodeEnv?.SUPABASE_URL ?? '').trim()
const envKey = (
  viteEnv?.VITE_SUPABASE_ANON_KEY ??
  nodeEnv?.VITE_SUPABASE_ANON_KEY ??
  nodeEnv?.SUPABASE_ANON_KEY ??
  ''
).trim()

/** True when real credentials are in `.env.local` / Vite env. */
export const isSupabaseConfigured = Boolean(envUrl && envKey)

export function getSupabaseEnvUrl(): string {
  return envUrl
}

export function getSupabaseEnvAnonKey(): string {
  return envKey
}
