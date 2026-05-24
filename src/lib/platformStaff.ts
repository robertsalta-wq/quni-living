import type { User } from '@supabase/supabase-js'
import { authUserEmail } from './adminEmails'
import { supabase, isSupabaseConfigured } from './supabase'

/** Calls `public.is_platform_admin()` for the current JWT session. */
export async function fetchIsPlatformAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  type RpcClient = {
    rpc(fn: 'is_platform_admin'): Promise<{ data: boolean | null; error: { message: string } | null }>
  }
  const { data, error } = await (supabase as unknown as RpcClient).rpc('is_platform_admin')
  if (error) return false
  return data === true
}

/** Links platform_staff.user_id when a staff member logs in (email match, user_id still null). */
export async function linkPlatformStaffUserIfNeeded(user: User): Promise<void> {
  if (!isSupabaseConfigured) return
  const email = authUserEmail(user)?.trim().toLowerCase()
  if (!email) return
  await supabase
    .from('platform_staff')
    .update({ user_id: user.id })
    .eq('email', email)
    .is('user_id', null)
}
