/**
 * Verify Supabase JWT and platform admin (platform_staff table or legacy user_metadata.role).
 */
import { createClient } from '@supabase/supabase-js'

/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 * @returns {Promise<boolean>}
 */
export async function isPlatformAdminUser(user) {
  if (!user) return false
  if (user.user_metadata?.role === 'admin') return true
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  if (!email) return false
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) return false
  const admin = createClient(supabaseUrl, serviceRole)
  const { data, error } = await admin.from('platform_staff').select('id').eq('email', email).maybeSingle()
  if (error) return false
  return data != null
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
  if (!(await isPlatformAdminUser(user))) {
    return { error: 'Admin access required', status: 403 }
  }
  return { user }
}
