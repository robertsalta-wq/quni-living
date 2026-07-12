import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES } from '../../api/lib/booking/tenantBookingPipelineStatuses.js'
import { isRenterRole } from '../../src/lib/marketplaceRole'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env'

export type AccommodationRoute = 'student' | 'non_student'

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Confirmed renter on the student accommodation route (admin Auth API + profile bootstrap). */
export async function createConfirmedStudentRenter(
  admin: SupabaseClient,
  email: string,
  password: string,
  fullName = 'E2E Booker',
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'renter',
      accommodation_verification_route: 'student',
    },
  })
  if (error) throw error
  if (!data.user?.id) throw new Error('createUser returned no user id')
  const userId = data.user.id

  const { error: profileErr } = await admin.from('student_profiles').upsert(
    {
      user_id: userId,
      email,
      full_name: fullName,
      accommodation_verification_route: 'student',
    },
    { onConflict: 'user_id' },
  )
  if (profileErr) throw profileErr
  return userId
}

export async function generateSignupConfirmCallbackUrl(
  admin: SupabaseClient,
  email: string,
  password: string,
  baseURL: string,
): Promise<{ userId: string; confirmUrl: string }> {
  const redirectTo = `${baseURL.replace(/\/$/, '')}/auth/callback`
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { redirectTo },
  })
  if (error) throw error
  if (!data?.user?.id) throw new Error('generateLink returned no user id')
  const hashedToken = data.properties?.hashed_token
  if (!hashedToken) throw new Error('generateLink returned no hashed_token')
  const confirmUrl = `${redirectTo}?token_hash=${encodeURIComponent(hashedToken)}&type=signup`
  return { userId: data.user.id, confirmUrl }
}

export async function assertStudentProfileReconciled(
  admin: SupabaseClient,
  userId: string,
  expectedRoute: AccommodationRoute,
): Promise<void> {
  const { data: profile, error: profileErr } = await admin
    .from('student_profiles')
    .select('user_id, accommodation_verification_route')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileErr) throw profileErr
  if (!profile) throw new Error(`student_profiles row missing for ${userId}`)
  if (profile.accommodation_verification_route !== expectedRoute) {
    throw new Error(
      `accommodation_verification_route expected ${expectedRoute}, got ${profile.accommodation_verification_route}`,
    )
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr) throw userErr
  const meta = userData.user?.user_metadata ?? {}
  if (!isRenterRole(meta.role)) {
    throw new Error(`user_metadata.role expected renter, got ${String(meta.role)}`)
  }
  const metaRoute = meta.accommodation_verification_route
  if (metaRoute !== expectedRoute) {
    throw new Error(
      `user_metadata.accommodation_verification_route expected ${expectedRoute}, got ${String(metaRoute)}`,
    )
  }
}

/** Deletes only the user created by this test (plus dependent profile rows). */
export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  const { data: profile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (profile?.id) {
    await admin.from('bookings').delete().eq('student_id', profile.id)
  }
  await admin.from('student_profiles').delete().eq('user_id', userId)
  await admin.from('landlord_profiles').delete().eq('user_id', userId)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.warn(`[e2e teardown] deleteUser(${userId}) failed: ${error.message}`)
  }
}

export async function getStudentProfileId(admin: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data.id
}

export async function deleteTestBooking(admin: SupabaseClient, bookingId: string): Promise<void> {
  const { error } = await admin.from('bookings').delete().eq('id', bookingId)
  if (error) {
    console.warn(`[e2e teardown] deleteTestBooking(${bookingId}) failed: ${error.message}`)
  }
}

/** Minimum non-document fields for student-route booking gate (docs uploaded via UI). */
export async function seedStudentProfileForBookingGate(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: uni, error: uniErr } = await admin.from('universities').select('id').limit(1).maybeSingle()
  if (uniErr) throw uniErr
  if (!uni?.id) throw new Error('No university row found for e2e profile seed')

  const now = new Date().toISOString()
  const { error } = await admin
    .from('student_profiles')
    .update({
      renter_situation: 'student',
      accommodation_verification_route: 'student',
      first_name: 'E2E',
      last_name: 'Booker',
      phone: '0412345678',
      gender: 'prefer_not_say',
      terms_accepted_at: now,
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '0498765432',
      uni_email: `e2e.uni.${Date.now()}@student.unimelb.edu.au`,
      uni_email_verified: true,
      university_id: uni.id,
      course: 'E2E Test Course',
      study_level: 'year_1',
      budget_min_per_week: 200,
      budget_max_per_week: 300,
      income_band: '400_600',
      onboarding_complete: true,
    })
    .eq('user_id', userId)
  if (error) throw error
}

export type StudentVerificationDocUrlColumn =
  | 'id_document_url'
  | 'identity_supporting_doc_url'
  | 'enrolment_doc_url'

/**
 * Storage upload can succeed before the subsequent student_profiles UPDATE lands.
 * Poll until the profile column is non-null so e2e assertions are not order/race dependent.
 */
export async function waitForStudentProfileDocUrl(
  admin: SupabaseClient,
  userId: string,
  column: StudentVerificationDocUrlColumn,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 30_000
  const pollMs = opts?.pollMs ?? 250
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const { data, error } = await admin
      .from('student_profiles')
      .select('id_document_url, identity_supporting_doc_url, enrolment_doc_url')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    const value = data?.[column]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    await new Promise((r) => setTimeout(r, pollMs))
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for student_profiles.${column} after verification doc upload (user ${userId})`,
  )
}

export async function findActiveListingPropertyId(admin: SupabaseClient): Promise<string> {
  const { data: properties, error: propErr } = await admin
    .from('properties')
    .select('id')
    .eq('status', 'active')
    .eq('service_tier', 'listing')
  if (propErr) throw propErr
  if (!properties?.length) {
    throw new Error('No active listing-tier property found for e2e booking apply')
  }

  const candidateIds = properties.map((p) => p.id).filter((id): id is string => Boolean(id))
  const { data: reservedRows, error: reservedErr } = await admin
    .from('bookings')
    .select('property_id')
    .in('property_id', candidateIds)
    .in('status', [...PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES])
  if (reservedErr) throw reservedErr

  const reservedIds = new Set(
    (reservedRows ?? [])
      .map((r) => r.property_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  )

  const available = properties.find((p) => p.id && !reservedIds.has(p.id))
  if (!available?.id) {
    throw new Error(
      'No unreserved active listing-tier property found for e2e booking apply (all candidates have a confirmed, active, or bond_pending booking)',
    )
  }
  return available.id
}
