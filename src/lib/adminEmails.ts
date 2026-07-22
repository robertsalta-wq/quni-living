import type { User } from '@supabase/supabase-js'

/**
 * Prefer `user.email`; OAuth / some session payloads only expose email on `identities`.
 */
export function authUserEmail(user: User | null | undefined): string | null {
  if (!user) return null
  if (user.email?.trim()) return user.email.trim()
  for (const identity of user.identities ?? []) {
    const raw = identity?.identity_data
    if (raw && typeof raw === 'object' && 'email' in raw) {
      const e = (raw as { email?: unknown }).email
      if (typeof e === 'string' && e.trim()) return e.trim()
    }
  }
  return null
}
