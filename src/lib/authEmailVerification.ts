import type { User } from '@supabase/supabase-js'

/** True when the auth user must confirm their email before using the app (Supabase “Confirm email” enabled). */
export function userNeedsEmailAddressVerification(user: User | null | undefined): boolean {
  if (!user?.email?.trim()) return false
  if (user.email_confirmed_at) return false
  return true
}
