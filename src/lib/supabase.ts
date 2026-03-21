import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** JWT `role` claim (unsigned decode) — detects service_role misuse in the browser. */
function readJwtRole(token: string): string | undefined {
  const part = token.split('.')[1]
  if (!part) return undefined
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  try {
    const { role } = JSON.parse(atob(b64 + pad)) as { role?: string }
    return role
  } catch {
    return undefined
  }
}

/**
 * Non-null when `VITE_SUPABASE_ANON_KEY` is a server-only key (causes "Forbidden use of secret API key in browser").
 * New Supabase keys: `sb_secret_*` = never in the browser. Use **Publishable** (`sb_publishable_*` or legacy anon JWT).
 */
export function getSupabaseBrowserKeyMisuseMessage(): string | null {
  if (!envKey) return null
  if (envKey.startsWith('sb_secret_')) {
    return (
      'You pasted a Secret key (sb_secret_…). The browser must use the Publishable key instead. ' +
      'Supabase → Project Settings → API → under Publishable keys, copy the default key into VITE_SUPABASE_ANON_KEY. ' +
      'Then restart npm run dev (local) or Redeploy (Vercel).'
    )
  }
  if (readJwtRole(envKey) === 'service_role') {
    return (
      'You are using the service_role JWT in the browser. Use the anon / public (publishable) key only in VITE_SUPABASE_ANON_KEY.'
    )
  }
  return null
}

if (typeof window !== 'undefined' && envKey) {
  const misuse = getSupabaseBrowserKeyMisuseMessage()
  if (misuse) {
    console.error('[Supabase]', misuse)
  }
}

/** True when real credentials are in `.env.local` */
export const isSupabaseConfigured = Boolean(envUrl && envKey)

/**
 * Supabase throws if url/key are empty at import time — that blanked the whole app.
 * Use placeholders when env is missing so React can render; gated features use
 * `isSupabaseConfigured` (Listings setup screen, etc.). Unconfigured requests fail at
 * the network layer only.
 */
const supabaseUrl = envUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = envKey || 'sb-placeholder-anon-key-not-configured'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // OAuth PKCE: exchange only on `/auth/callback`. If true, the client can consume
    // `?code=` before React reads it → false "Sign-in failed" on Google login.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
