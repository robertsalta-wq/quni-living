/**
 * Work/business email validation for non-student work email OTP.
 *
 * Rules:
 * - Accept any valid business domain.
 * - Reject common free providers (gmail/hotmail/outlook/yahoo/etc).
 */

const FREE_PROVIDER_HOSTS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'yahoo.com',
  'ymail.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'protonmail.com',
  'proton.me',
  'fastmail.com',
] as const

function parseHost(hostRaw: string): string {
  return hostRaw.trim().toLowerCase()
}

export function parseEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function isAllowedWorkEmailDomain(domainRaw: string): boolean {
  const host = parseHost(domainRaw)
  if (!host) return false
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false
  if (!host.includes('.')) return false

  for (const free of FREE_PROVIDER_HOSTS) {
    if (host === free || host.endsWith('.' + free)) return false
  }

  return true
}

export function workEmailDomainErrorMessage(): string {
  return 'Please enter a work or business email address'
}

export function isValidWorkEmailForVerification(email: string): boolean {
  const domain = parseEmailDomain(email)
  if (!domain) return false
  return isAllowedWorkEmailDomain(domain)
}

