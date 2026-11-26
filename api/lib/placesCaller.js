/**
 * Landlord or platform-admin session for routes that spend the Google Places key.
 * A missing or invalid bearer token returns before any Google call.
 */
import { createClient } from '@supabase/supabase-js'
import { isPlatformAdminUser } from './adminAuth.js'

/**
 * @param {Request} request
 * @returns {Promise<{ user: import('@supabase/supabase-js').User, error?: undefined, status?: undefined } | { user?: undefined, error: string, status: number }>}
 */
export async function requireLandlordOrAdmin(request) {
  const header = request.headers.get('authorization') || ''
  const token = /^(?:Bearer)\s+(\S+)/i.exec(header.trim())?.[1] ?? ''
  if (!token) return { error: 'unauthorized', status: 401 }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return { error: 'unavailable', status: 503 }
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) return { error: 'unauthorized', status: 401 }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: landlord, error: landlordErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (landlordErr) return { error: 'unavailable', status: 503 }
    if (landlord) return { user }
    if (await isPlatformAdminUser(user)) return { user }
    return { error: 'forbidden', status: 403 }
  } catch {
    return { error: 'unavailable', status: 503 }
  }
}
