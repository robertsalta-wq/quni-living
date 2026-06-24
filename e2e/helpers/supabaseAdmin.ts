import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isRenterRole } from '../../src/lib/marketplaceRole'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env'

export type AccommodationRoute = 'student' | 'non_student'

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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
  await admin.from('student_profiles').delete().eq('user_id', userId)
  await admin.from('landlord_profiles').delete().eq('user_id', userId)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.warn(`[e2e teardown] deleteUser(${userId}) failed: ${error.message}`)
  }
}
