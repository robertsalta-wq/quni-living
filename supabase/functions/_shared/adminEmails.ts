/**
 * Keep in sync with `src/lib/adminEmails.ts` → `ADMIN_EMAILS`.
 */
export const ADMIN_EMAILS = ['hello@quni.com.au'] as const

const ADMIN_SET = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()))

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  return ADMIN_SET.has(email.trim().toLowerCase())
}

function authUserEmail(user: { email?: string | null; identities?: { identity_data?: unknown }[] }): string | null {
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

export function isAdminUser(user: {
  email?: string | null
  identities?: { identity_data?: unknown }[]
} | null): boolean {
  return isAdminEmail(authUserEmail(user ?? {}))
}
