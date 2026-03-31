/**
 * Verify Supabase JWT and platform admin (email allowlist or user_metadata.role === 'admin').
 */
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = new Set(['hello@quni.com.au'])

export function isPlatformAdminUser(user) {
  if (!user) return false
  const role = user.user_metadata?.role
  if (role === 'admin') return true
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  if (email && ADMIN_EMAILS.has(email)) return true
  return false
}

/**
 * @param {Request} request
 * @param {string} supabaseUrl
 * @param {string} anonKey
 * @returns {Promise<{ user: import('@supabase/supabase-js').User } | { error: string, status: number }>}
 */
export async function requireAdminUser(request, supabaseUrl, anonKey) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { error: 'Missing authorization', status: 401 }
  }
  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)
  if (userErr || !user) {
    return { error: 'Invalid or expired session', status: 401 }
  }
  if (!isPlatformAdminUser(user)) {
    return { error: 'Admin access required', status: 403 }
  }
  return { user }
}
