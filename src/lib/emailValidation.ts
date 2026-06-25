/** Basic user@domain.tld check — rejects addresses with no domain TLD (e.g. user@outlook). */
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const SIGNUP_EMAIL_INVALID_MESSAGE = 'Enter a valid email address'

export function isValidEmailAddress(raw: string): boolean {
  const email = raw.trim()
  if (!email) return false
  return EMAIL_FORMAT_REGEX.test(email)
}
