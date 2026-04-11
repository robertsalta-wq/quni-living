import type { User } from '@supabase/supabase-js'

/** Hardcoded admin accounts — compared case-insensitively to `user.email`. Sync with `supabase/functions/_shared/adminEmails.ts`. */
export const ADMIN_EMAILS = ['hello@quni.com.au'] as const

const ADMIN_SET = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()))

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

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  return ADMIN_SET.has(email.trim().toLowerCase())
}

export function isAdminUser(user: User | null | undefined): boolean {
  return isAdminEmail(authUserEmail(user))
}
