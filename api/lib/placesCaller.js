/**
 * Landlord or platform-admin session for routes that spend the Google Places key.
 * A missing or invalid bearer token returns before any Google call.
 * Suggestion requests can skip the landlord lookup when they carry a fresh pass.
 * Place Details and Confirm always read landlord_profiles or platform_staff.
 */
import { createClient } from '@supabase/supabase-js'
import { isPlatformAdminUser } from './adminAuth.js'
import { issueLandlordPass, landlordPassMatches, verifySupabaseAccessToken } from './placesAccess.js'

/**
 * @param {Request} request
 * @param {{ allowPass?: boolean }} [options]
 * @returns {Promise<{ user: { id: string, email?: string }, pass?: string, error?: undefined, status?: undefined } | { user?: undefined, error: string, status: number, pass?: undefined }>}
 */
export async function requireLandlordOrAdmin(request, options = {}) {
  const header = request.headers.get('authorization') || ''
  const token = /^(?:Bearer)\s+(\S+)/i.exec(header.trim())?.[1] ?? ''
  if (!token) return { error: 'unauthorized', status: 401 }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl) return { error: 'unavailable', status: 503 }

  try {
    const verified = await verifySupabaseAccessToken(token)
    /** @type {{ id: string, email?: string } | null} */
    let user = null
    if (verified.ok) {
      user = { id: verified.sub, email: verified.email }
    } else if (verified.reason === 'unconfigured' || verified.reason === 'malformed') {
      if (!anonKey) return { error: 'unavailable', status: 503 }
      const supabaseAuth = createClient(supabaseUrl, anonKey)
      const {
        data: { user: remote },
        error: userErr,
      } = await supabaseAuth.auth.getUser(token)
      if (userErr || !remote) return { error: 'unauthorized', status: 401 }
      user = remote
    } else {
      return { error: 'unauthorized', status: 401 }
    }

    const presented = request.headers.get('x-quni-places-pass')
    if (options.allowPass && (await landlordPassMatches(presented, user.id))) {
      return { user, pass: presented || undefined }
    }

    if (!serviceRole) return { error: 'unavailable', status: 503 }
    const admin = createClient(supabaseUrl, serviceRole)
    const { data: landlord, error: landlordErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (landlordErr) return { error: 'unavailable', status: 503 }
    if (!landlord && !(await isPlatformAdminUser(user))) return { error: 'forbidden', status: 403 }
    const pass = await issueLandlordPass(user.id)
    return pass ? { user, pass } : { user }
  } catch {
    return { error: 'unavailable', status: 503 }
  }
}
