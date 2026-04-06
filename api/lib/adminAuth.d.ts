import type { User } from '@supabase/supabase-js'

export function isPlatformAdminUser(user: User | null | undefined): boolean

export function requireAdminUser(
  request: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ user: User } | { error: string; status: number }>
