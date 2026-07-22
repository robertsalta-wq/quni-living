import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** True when the JWT email is in platform_staff (authoritative is_platform_admin RPC). */
export async function isPlatformAdminUser(
  userClient: SupabaseClient,
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): Promise<boolean> {
  if (!user) return false
  const { data, error } = await userClient.rpc('is_platform_admin')
  if (error) return false
  return data === true
}
