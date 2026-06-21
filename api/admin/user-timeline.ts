/**
 * GET /api/admin/user-timeline
 *
 * Read-only support lookup: resolve a person by email or user_id, return current
 * account state plus journey_events timeline. Logs student profile views to
 * profile_access_log when a renter profile is resolved.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'

type AdminClient = SupabaseClient

export const config = { runtime: 'edge' }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EVENT_LIMIT = 500

type JourneyEventRow = {
  id: string
  created_at: string
  user_id: string | null
  email: string | null
  attempt_id: string | null
  property_id: string | null
  event_type: string
  step: string | null
  error_code: string | null
  http_status: number | null
  service_tier: string | null
  source: string
  metadata: Record<string, unknown>
}

type AccountState = {
  resolved: boolean
  user_id: string | null
  email: string | null
  role: 'student' | 'landlord' | 'admin' | null
  accommodation_verification_route: string | null
  verification_type: string | null
  onboarding_complete: boolean | null
  created_at: string | null
  student_profile_id: string | null
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Cache-Control': 'no-store',
    },
  })
}

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email || !email.includes('@')) return null
  return email
}

function parseQueryInput(url: URL): { userId: string | null; email: string | null; raw: string } | null {
  const userIdParam = url.searchParams.get('user_id')?.trim() || ''
  const emailParam = url.searchParams.get('email')?.trim() || ''
  const qParam = url.searchParams.get('q')?.trim() || ''

  if (userIdParam) {
    if (!UUID_RE.test(userIdParam)) return null
    return { userId: userIdParam, email: normalizeEmail(emailParam), raw: userIdParam }
  }

  if (emailParam) {
    const email = normalizeEmail(emailParam)
    if (!email) return null
    return { userId: null, email, raw: emailParam }
  }

  if (!qParam) return null

  if (UUID_RE.test(qParam)) {
    return { userId: qParam, email: null, raw: qParam }
  }

  const email = normalizeEmail(qParam)
  if (!email) return null
  return { userId: null, email, raw: qParam }
}

async function resolveAccount(
  admin: AdminClient,
  input: { userId: string | null; email: string | null },
): Promise<AccountState> {
  const empty: AccountState = {
    resolved: false,
    user_id: input.userId,
    email: input.email,
    role: null,
    accommodation_verification_route: null,
    verification_type: null,
    onboarding_complete: null,
    created_at: null,
    student_profile_id: null,
  }

  let userId = input.userId
  let email = input.email

  if (userId) {
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId)
    if (authErr || !authData?.user) {
      return { ...empty, resolved: false, user_id: userId }
    }
    const authUser = authData.user
    if (!email && authUser.email) {
      email = normalizeEmail(authUser.email)
    }
    userId = authUser.id
  }

  const [studentRes, landlordRes, staffRes] = await Promise.all([
    userId
      ? admin
          .from('student_profiles')
          .select(
            'id, user_id, email, onboarding_complete, verification_type, accommodation_verification_route, created_at',
          )
          .eq('user_id', userId)
          .maybeSingle()
      : email
        ? admin
            .from('student_profiles')
            .select(
              'id, user_id, email, onboarding_complete, verification_type, accommodation_verification_route, created_at',
            )
            .ilike('email', email)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    userId
      ? admin
          .from('landlord_profiles')
          .select('id, user_id, email, onboarding_complete, created_at')
          .eq('user_id', userId)
          .maybeSingle()
      : email
        ? admin
            .from('landlord_profiles')
            .select('id, user_id, email, onboarding_complete, created_at')
            .ilike('email', email)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    email
      ? admin.from('platform_staff').select('id').eq('email', email).maybeSingle()
      : userId
        ? admin.auth.admin.getUserById(userId).then(async ({ data }) => {
            const staffEmail = data?.user?.email ? normalizeEmail(data.user.email) : null
            if (!staffEmail) return { data: null, error: null }
            return admin.from('platform_staff').select('id').eq('email', staffEmail).maybeSingle()
          })
        : Promise.resolve({ data: null, error: null }),
  ])

  const student = studentRes.data as {
    id: string
    user_id: string
    email: string | null
    onboarding_complete: boolean
    verification_type: string
    accommodation_verification_route: string | null
    created_at: string
  } | null

  const landlord = landlordRes.data as {
    id: string
    user_id: string
    email: string | null
    onboarding_complete: boolean
    created_at: string
  } | null

  const isStaff = staffRes.data != null

  if (!userId) {
    userId = student?.user_id ?? landlord?.user_id ?? null
  }
  if (!email) {
    email =
      (student?.email ? normalizeEmail(student.email) : null) ??
      (landlord?.email ? normalizeEmail(landlord.email) : null)
  }

  let authCreatedAt: string | null = null
  if (userId) {
    const { data: authData } = await admin.auth.admin.getUserById(userId)
    authCreatedAt = authData?.user?.created_at ?? null
    if (!email && authData?.user?.email) {
      email = normalizeEmail(authData.user.email)
    }
  }

  if (!student && !landlord && !userId && !isStaff) {
    return { ...empty, email }
  }

  let role: AccountState['role'] = null
  if (isStaff) {
    role = 'admin'
  } else if (student) {
    role = 'student'
  } else if (landlord) {
    role = 'landlord'
  } else if (userId) {
    const { data: authData } = await admin.auth.admin.getUserById(userId)
    if (authData?.user?.user_metadata?.role === 'admin') role = 'admin'
    else if (authData?.user?.user_metadata?.role === 'landlord') role = 'landlord'
    else if (authData?.user?.user_metadata?.role === 'student') role = 'student'
  }

  if (student) {
    return {
      resolved: true,
      user_id: student.user_id,
      email: email ?? (student.email ? normalizeEmail(student.email) : null),
      role: role ?? 'student',
      accommodation_verification_route: student.accommodation_verification_route,
      verification_type: student.verification_type,
      onboarding_complete: student.onboarding_complete,
      created_at: authCreatedAt ?? student.created_at,
      student_profile_id: student.id,
    }
  }

  if (landlord) {
    return {
      resolved: true,
      user_id: landlord.user_id,
      email: email ?? (landlord.email ? normalizeEmail(landlord.email) : null),
      role: role ?? 'landlord',
      accommodation_verification_route: null,
      verification_type: null,
      onboarding_complete: landlord.onboarding_complete,
      created_at: authCreatedAt ?? landlord.created_at,
      student_profile_id: null,
    }
  }

  return {
    resolved: Boolean(userId || isStaff),
    user_id: userId,
    email,
    role: isStaff ? 'admin' : role,
    accommodation_verification_route: null,
    verification_type: null,
    onboarding_complete: null,
    created_at: authCreatedAt,
    student_profile_id: null,
  }
}

async function fetchJourneyEvents(
  admin: AdminClient,
  userId: string | null,
  email: string | null,
): Promise<JourneyEventRow[]> {
  let query = admin
    .from('journey_events')
    .select(
      'id, created_at, user_id, email, attempt_id, property_id, event_type, step, error_code, http_status, service_tier, source, metadata',
    )
    .order('created_at', { ascending: false })
    .limit(EVENT_LIMIT)

  if (userId && email) {
    query = query.or(`user_id.eq.${userId},email.ilike.${email}`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (email) {
    query = query.ilike('email', email)
  } else {
    return []
  }

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as JourneyEventRow[]).map((row) => ({
    ...row,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  }))
}

async function logProfileAccess(
  admin: AdminClient,
  adminUser: { id: string; email?: string | null },
  studentProfileId: string,
): Promise<void> {
  try {
    const { error } = await admin.from('profile_access_log').insert({
      admin_user_id: adminUser.id,
      admin_email: adminUser.email?.trim() || 'unknown',
      student_profile_id: studentProfileId,
    })
    if (error) console.error('[api/admin/user-timeline] profile_access_log', error.message)
  } catch (e) {
    console.error('[api/admin/user-timeline] profile_access_log', e)
  }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in auth) {
    return json({ error: auth.error }, auth.status, origin)
  }

  const url = new URL(request.url)
  const parsed = parseQueryInput(url)
  if (!parsed) {
    return json({ error: 'Provide q, email, or user_id' }, 400, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  try {
    const account = await resolveAccount(admin, {
      userId: parsed.userId,
      email: parsed.email,
    })

    const lookupUserId = account.user_id ?? parsed.userId
    const lookupEmail = account.email ?? parsed.email

    const events = await fetchJourneyEvents(admin, lookupUserId, lookupEmail)

    if (account.student_profile_id) {
      await logProfileAccess(admin, auth.user, account.student_profile_id)
    }

    return json(
      {
        query: { q: parsed.raw, email: lookupEmail, user_id: lookupUserId },
        account,
        events,
        events_truncated: events.length >= EVENT_LIMIT,
      },
      200,
      origin,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/admin/user-timeline]', message)
    return json({ error: 'Failed to load timeline' }, 500, origin)
  }
}
