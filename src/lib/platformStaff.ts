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
