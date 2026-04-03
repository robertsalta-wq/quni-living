/** Mirror src/lib/workEmailDomains.ts BASE_DOMAINS — update both when changing. */

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

function normalizeHost(hostRaw: string): string {
  return hostRaw.trim().toLowerCase()
}

export function parseEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function isAllowedWorkEmailDomain(domainRaw: string): boolean {
  const host = normalizeHost(domainRaw)
  if (!host) return false
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false

  // Business domains have at least one dot.
  if (!host.includes('.')) return false

  for (const free of FREE_PROVIDER_HOSTS) {
    if (host === free || host.endsWith('.' + free)) return false
  }

  return true
}

export function workEmailDomainErrorMessage(): string {
  return 'Please enter a work or business email address'
}

