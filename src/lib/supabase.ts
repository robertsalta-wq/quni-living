import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

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
