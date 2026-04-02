/**
 * Australian university email domains for student verification.
 * Subdomains of these bases are accepted (e.g. student.unsw.edu.au).
 * Keep in sync with supabase/functions/send-uni-otp/allowedDomains.ts (edge copy).
 */
const BASE_DOMAINS = [
  'sydney.edu.au',
  'unsw.edu.au',
  'uts.edu.au',
  'mq.edu.au',
  'westernsydney.edu.au',
  'newcastle.edu.au',
  'uon.edu.au',
  'uow.edu.au',
  'scu.edu.au',
  'csu.edu.au',
  'unimelb.edu.au',
  'monash.edu',
  'monash.edu.au',
  'rmit.edu.au',
  'deakin.edu.au',
  'latrobe.edu.au',
  'swin.edu.au',
  'swinburne.edu.au',
  'vu.edu.au',
  'federation.edu.au',
  'uq.edu.au',
  'qut.edu.au',
  'griffith.edu.au',
  'jcu.edu.au',
  'usq.edu.au',
  'bond.edu.au',
  'cqu.edu.au',
  'uwa.edu.au',
  'curtin.edu.au',
  'murdoch.edu.au',
  'ecu.edu.au',
  'nd.edu.au',
  'adelaide.edu.au',
  'unisa.edu.au',
  'flinders.edu.au',
  'anu.edu.au',
  'canberra.edu.au',
  'utas.edu.au',
  'cdu.edu.au',
  'acu.edu.au',
] as const

/** Must be a direct .edu.au institution domain, not a random subdomain-only rule. */
export function isAllowedUniEmailDomain(hostRaw: string): boolean {
  const host = hostRaw.trim().toLowerCase()
  if (!host || host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false

  for (const base of BASE_DOMAINS) {
    if (host === base || host.endsWith('.' + base)) return true
  }
  return false
}

export function uniEmailDomainErrorMessage(): string {
  return 'Use an email address from your Australian university (e.g. yourname@student.unsw.edu.au).'
}

/**
 * Returns the domain part of an email or null if invalid.
 */
export function parseEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function isValidUniEmailForVerification(email: string): boolean {
  const domain = parseEmailDomain(email)
  if (!domain) return false
  return isAllowedUniEmailDomain(domain)
}
