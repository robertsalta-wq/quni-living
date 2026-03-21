/** Hardcoded admin accounts — compared case-insensitively to `user.email`. */
export const ADMIN_EMAILS = ['hello@quni.com.au', 'robertsalta@gmail.com'] as const

const ADMIN_SET = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()))

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  return ADMIN_SET.has(email.trim().toLowerCase())
}
