import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** True when JWT email is in platform_staff (or legacy user_metadata.role = admin). */
export async function isPlatformAdminUser(
  userClient: SupabaseClient,
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): Promise<boolean> {
  if (!user) return false
  if (user.user_metadata?.role === 'admin') return true
  const { data, error } = await userClient.rpc('is_platform_admin')
  if (error) return false
  return data === true
}
