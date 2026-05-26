import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'

export type MessagingEnv = {
  supabaseUrl: string
  serviceRole: string
  anonKey: string
}

export function readMessagingEnv(): MessagingEnv | null {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !serviceRole || !anonKey) return null
  return { supabaseUrl, serviceRole, anonKey }
}

export function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export type AuthenticatedMessaging = {
  user: User
  admin: SupabaseClient<Database>
}

export async function authenticateMessagingRequest(
  env: MessagingEnv,
  token: string,
): Promise<{ ok: true; data: AuthenticatedMessaging } | { ok: false; status: number; error: string }> {
  const supabaseAuth = createClient<Database>(env.supabaseUrl, env.anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' }
  }

  const admin = createClient<Database>(env.supabaseUrl, env.serviceRole)
  return { ok: true, data: { user, admin } }
}

export function firstNameFromFullName(fullName: string | null | undefined): string {
  const t = (fullName ?? '').trim()
  if (!t) return 'Someone'
  const first = t.split(/\s+/)[0]
  return first || 'Someone'
}
