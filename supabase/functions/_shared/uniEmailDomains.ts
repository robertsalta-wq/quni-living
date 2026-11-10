/**
 * Australian university email domains for student verification.
 * Subdomains of these bases are accepted (e.g. student.unsw.edu.au).
 * Single source for the app and send-uni-otp. Do not copy this list.
 */

/** Inbox for "we don't recognise this university yet". Swap this to change both the app and the edge function. */
export const UNI_DOMAIN_REQUEST_EMAIL = 'hello@quni.com.au'

export const BASE_DOMAINS = [
  'sydney.edu.au',
  'unsw.edu.au',
  'uts.edu.au',
  'mq.edu.au',
  'westernsydney.edu.au',
  'newcastle.edu.au',
  'uon.edu.au',
  'uow.edu.au',
  'uowmail.edu.au',
  'scu.edu.au',
  'csu.edu.au',
  'une.edu.au',
  'myune.edu.au',
  'avondale.edu.au',
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
  'griffithuni.edu.au',
  'jcu.edu.au',
  'usq.edu.au',
  'unisq.edu.au',
  'usc.edu.au',
  'bond.edu.au',
  'cqu.edu.au',
  'cqumail.com',
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
  'myacu.edu.au',
] as const

/** Personal inboxes. Same set as work-email rejection, so Gmail gets "use your uni address" rather than "we don't recognise this university". */
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

function cleanHost(hostRaw: string): string | null {
  const host = hostRaw.trim().toLowerCase()
  if (!host || host.includes('..') || host.startsWith('.') || host.endsWith('.')) return null
  return host
}

function hostMatches(host: string, base: string): boolean {
  return host === base || host.endsWith('.' + base)
}

/** Must be a direct .edu.au (or listed) institution domain, not a random subdomain-only rule. */
export function isAllowedUniEmailDomain(hostRaw: string): boolean {
  const host = cleanHost(hostRaw)
  if (!host) return false
  for (const base of BASE_DOMAINS) {
    if (hostMatches(host, base)) return true
  }
  return false
}

export function isFreeEmailProvider(hostRaw: string): boolean {
  const host = cleanHost(hostRaw)
  if (!host) return false
  for (const base of FREE_PROVIDER_HOSTS) {
    if (hostMatches(host, base)) return true
  }
  return false
}

export function uniEmailDomainErrorMessage(): string {
  return 'Use an email address from your Australian university (e.g. yourname@student.unsw.edu.au).'
}

export function uniEmailUnrecognisedDomainMessage(): string {
  return `We don't recognise this university email yet. Email ${UNI_DOMAIN_REQUEST_EMAIL} from this address and we'll add it.`
}

export type UniEmailRejectionReason = 'invalid' | 'free_provider' | 'unrecognised'

export type UniEmailRejection = {
  reason: UniEmailRejectionReason
  message: string
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

/** Null when the address may be sent a university verification code. */
export function uniEmailRejection(email: string): UniEmailRejection | null {
  const domain = parseEmailDomain(email)
  if (!domain || !cleanHost(domain)) {
    return { reason: 'invalid', message: 'Enter a valid email address.' }
  }
  if (isAllowedUniEmailDomain(domain)) return null
  if (isFreeEmailProvider(domain)) {
    return { reason: 'free_provider', message: uniEmailDomainErrorMessage() }
  }
  return { reason: 'unrecognised', message: uniEmailUnrecognisedDomainMessage() }
}

export function isValidUniEmailForVerification(email: string): boolean {
  return uniEmailRejection(email) == null
}
